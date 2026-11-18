# ==============================================================================
# DLsite の取り込み（Cloud Run Jobs）
# ==============================================================================
# fetchDLsiteUnifiedData（Functions・540 秒）の移行先（SPR-417 / 設計は SPR-358）。レート制限（429 /
# Retry-After つきの 404）を受けても、解除を待って同じ実行の中で続けられるように、長く走れる Jobs に移す。
#
# **いまは、ジョブはどこからも起動されない**（スケジューラは Functions 宛てのまま＝
# function_dlsite_individual_info_api.tf）。手動で 1 回実行して確かめてから、スケジューラを付け替える。
#
# 設定の正本（ADR-009 の Jobs 側）:
# - ジョブの設定（メモリ・timeout・引数・環境変数・サービスアカウント）は **この Terraform が正本**。
# - イメージは deploy-functions.yml が build / push して、ジョブを :<sha> に差し替える（apps/functions/Dockerfile）。
#   ジョブを足したら、deploy-functions.yml の「Update jobs to the pushed image」の一覧にも足す。
#   Functions（gcloud functions deploy が spec の正本）とは逆なので注意。
# ==============================================================================

locals {
  # 同じイメージを、引数（apps/functions/src/jobs/run-job.ts の JobMode）違いで使う
  dlsite_jobs = {
    hourly = {
      name = "fetch-dlsite-unified-data"
      mode = "dlsite"
    }
    weekly_full_sweep = {
      name = "fetch-dlsite-unified-data-full-sweep"
      mode = "dlsite-full-sweep"
    }
  }

  functions_jobs_latest_image = "${var.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.functions_jobs.repository_id}/jobs:latest"
}

# 稼働中のジョブの image を読み取って踏襲する（cloud_run.tf の SPR-67 と同じ理由）。
# ignore_changes で image を無視すると state に古い SHA が残り、別の差分で update が走ったときに、
# cleanup policy で消えたイメージを指してしまう。
data "google_cloud_run_v2_job" "dlsite_current" {
  for_each = var.dlsite_jobs_bootstrap ? {} : local.dlsite_jobs

  name     = each.value.name
  location = var.region
}

resource "google_cloud_run_v2_job" "dlsite" {
  for_each = local.dlsite_jobs

  name     = each.value.name
  location = var.region

  labels = local.common_labels

  # provider の既定も true。意図として明示する。for_each のキーや name を変えると replace（削除 → 作成）になり、
  # この設定で apply が失敗する。変えるときは、先に false にして apply する。
  deletion_protection = true

  template {
    task_count = 1

    template {
      service_account = google_service_account.fetch_dlsite_individual_api_sa.email

      # 58 分。アプリ側の「実行中」の印の期限（apps/functions/src/endpoints/dlsite/process-batch.ts の
      # JOB_RUN_BUDGET.lockTtlMs）と **同じ値にする**。こちらを長くすると、走っている途中で印の期限が切れ、
      # 次の毎時の起動と重なりうる。アプリは 55 分で取得を締め切る（同 fetchDeadlineMs）ので、
      # 平常はこの timeout に当たらない。
      timeout = "3480s"

      # リトライしない。失敗した実行の続きは、次の毎時の起動が継続カーソルから取る（SPR-358）。
      # Jobs の既定は 3 回で、レート制限中に同じリクエストを繰り返すことになる。
      max_retries = 0

      containers {
        # 稼働中のジョブの image を踏襲する。初回（var.dlsite_jobs_bootstrap = true）は :latest
        image = (
          var.dlsite_jobs_bootstrap
          ? local.functions_jobs_latest_image
          : data.google_cloud_run_v2_job.dlsite_current[each.key].template[0].template[0].containers[0].image
        )

        # ENTRYPOINT は `node lib/job.js`（Dockerfile）。引数がモード
        args = [each.value.mode]

        resources {
          limits = {
            # Jobs の CPU は 1 が下限（1 未満は指定できない）。メモリは Functions のときと同じ 512Mi
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        # Functions のデプロイ（deploy-functions.yml の --set-env-vars）と同じ値。
        # false にすると、ティア差分を無視して毎回全件を取得する（run-unified-data-collection.ts）
        env {
          name  = "DLSITE_TIER_FILTERING_ENABLED"
          value = "true"
        }
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_project_iam_member.fetch_dlsite_individual_api_firestore_user,
    google_project_iam_member.fetch_dlsite_individual_api_log_writer,
  ]
}

# deploy-functions.yml が、push したイメージへジョブを差し替えるための権限（run.jobs.update）。
# ジョブ単位で付ける（project 単位の run.developer だと、web の Cloud Run サービスも書き換えられる）。
# 実行 SA への actAs は、Functions のデプロイ用に付いているもの（iam.tf の cloud_functions_deployer_act_as）が
# そのまま効く。更新の完了待ち（run.operations.get）は、project 単位の roles/viewer に含まれる。
# run.developer は run.jobs.run も含むので、この SA はジョブを実行することもできる（使ってはいない）。
# update だけのロールは事前定義に無く、ジョブ 2 つのためにカスタムロールを足すほどではないと判断した。
resource "google_cloud_run_v2_job_iam_member" "dlsite_deployer_developer" {
  for_each = google_cloud_run_v2_job.dlsite

  project  = var.gcp_project_id
  location = each.value.location
  name     = each.value.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}
