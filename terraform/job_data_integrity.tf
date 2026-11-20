# ==============================================================================
# 整合性チェック（Cloud Run Jobs）
# ==============================================================================
# checkDataIntegrity（Functions・540 秒）の移行先（SPR-416 / 設計は SPR-358）。
# 過去 5 回の所要時間は 374〜462 秒で、関数の timeout（540 秒）まで 78 秒しか無かった。works / circles /
# creators を全件読んで事後修復する処理で、データが増えるほど延びる。長く走れる Jobs に移す。
#
# 起動するのは Cloud Scheduler（function_data_integrity_check.tf。日曜 3:00 JST）。監視は monitoring_data_integrity.tf。
#
# 設定の正本は、DLsite のジョブ（job_dlsite.tf）と同じ（ADR-009 の Jobs 側）:
# - ジョブの設定（メモリ・timeout・引数・環境変数・サービスアカウント）は **この Terraform が正本**。
# - イメージは deploy-functions.yml が build / push して、ジョブを :<sha> に差し替える（DLsite のジョブと同じ
#   イメージ・引数違い）。ジョブ名は、deploy-functions.yml の「Update jobs to the pushed image」の一覧にも書いてある。
# ==============================================================================

locals {
  data_integrity_job_name = "check-data-integrity"
}

# 稼働中のジョブの image を読み取って踏襲する（job_dlsite.tf と同じ理由）
data "google_cloud_run_v2_job" "data_integrity_current" {
  count = var.data_integrity_job_bootstrap ? 0 : 1

  name     = local.data_integrity_job_name
  location = var.region
}

resource "google_cloud_run_v2_job" "data_integrity" {
  name     = local.data_integrity_job_name
  location = var.region

  labels = local.common_labels

  # provider の既定も true。意図として明示する。name を変えると replace（削除 → 作成）になり、
  # この設定で apply が失敗する。変えるときは、先に false にして apply する。
  deletion_protection = true

  template {
    task_count = 1

    template {
      service_account = google_service_account.data_integrity_check_sa.email

      # 30 分。実測の最長（462 秒）の約 4 倍。データが増えても、当面はここに当たらない。
      # 当たるようになったら、処理の作り（全件読み）を見直す合図として扱う（timeout を延ばす前に）。
      timeout = "1800s"

      # リトライしない。失敗したら、原因を見てから手動で流すか、翌週の実行に任せる（関数のときもリトライ無し）。
      # Jobs の既定は 3 回で、修復の途中で落ちた処理を、原因が分からないまま繰り返すことになる。
      max_retries = 0

      containers {
        # 稼働中のジョブの image を踏襲する。初回（var.data_integrity_job_bootstrap = true）は :latest
        image = (
          var.data_integrity_job_bootstrap
          ? local.functions_jobs_latest_image
          : data.google_cloud_run_v2_job.data_integrity_current[0].template[0].template[0].containers[0].image
        )

        # ENTRYPOINT は `node lib/job.js`（Dockerfile）。引数がモード（apps/functions/src/jobs/run-job.ts の JobMode）。
        # 常に dryRun=false（修復を書き込む）で走る。
        args = ["integrity"]

        resources {
          limits = {
            # Jobs の CPU は 1 が下限。メモリは Functions のときと同じ 512Mi
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }
  }

  # gcloud run jobs update（deploy-functions.yml）が付けるメタデータ。無視しないと差分が出続ける（job_dlsite.tf と同じ）
  lifecycle {
    ignore_changes = [client, client_version]
  }

  depends_on = [
    google_project_service.run,
    google_project_iam_member.data_integrity_check_firestore_user,
    google_project_iam_member.data_integrity_check_log_writer,
  ]
}

# deploy-functions.yml が、push したイメージへジョブを差し替えるための権限（job_dlsite.tf の dlsite_deployer_developer と同じ）
resource "google_cloud_run_v2_job_iam_member" "data_integrity_deployer_developer" {
  project  = var.gcp_project_id
  location = google_cloud_run_v2_job.data_integrity.location
  name     = google_cloud_run_v2_job.data_integrity.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# スケジューラがジョブを起動するための権限（run.jobs.run）。ジョブ単位で付ける。
# 呼ぶ主体はジョブの実行 SA。この SA は Eventarc 用に project 単位の run.invoker も持っている
# （function_data_integrity_check.tf の data_integrity_check_run_invoker）。そちらは旧 Functions の撤去（SPR-419）で外す。
resource "google_cloud_run_v2_job_iam_member" "data_integrity_scheduler_invoker" {
  project  = var.gcp_project_id
  location = google_cloud_run_v2_job.data_integrity.location
  name     = google_cloud_run_v2_job.data_integrity.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.data_integrity_check_sa.email}"
}
