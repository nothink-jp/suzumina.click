# ==============================================================================
# 整合性チェック: スケジューラ・サービスアカウントと、旧 Functions（checkDataIntegrity）の土台
# ==============================================================================
# 週次で実行されるデータ整合性チェック（事後修復）:
# - CircleのworkIds配列の整合性
# - 孤立したCreatorマッピングのクリーンアップ
# - Work-Circle相互参照の整合性
#
# **整合性チェックは Cloud Run Jobs で動く**（SPR-416 / 設計は SPR-358。ジョブの定義は job_data_integrity.tf）。
# このファイルにあるのは、ジョブを起動する Cloud Scheduler、実行 SA、旧 Functions のための Pub/Sub トピックと権限。
#
# 旧 Functions（checkDataIntegrity）は、まだデプロイされている（deploy-functions.yml）。トピックと Eventarc まわりの
# 権限も残してある。**どこからも起動されない。** 戻すときの受け皿として SPR-419 まで残す。
# 戻し方: スケジューラの http_target を pubsub_target（このトピック宛て）に戻し、monitoring_data_integrity.tf の
# アラートを関数向けに戻す（付け替えた PR ごと revert するのが確実）。
#
# 関数の spec の正本は deploy-functions.yml（ADR-009 原則2）。
# ==============================================================================

locals {
  data_integrity_check_function_name = "checkDataIntegrity"
}

# データ整合性チェック用のPub/Subトピック
resource "google_pubsub_topic" "data_integrity_check_trigger" {
  project = var.gcp_project_id
  name    = "data-integrity-check-trigger"

  labels = {
    environment = var.environment
    function    = "data-integrity-check"
    managed-by  = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# データ整合性チェック用のCloud Scheduler（週次実行）→ ジョブ check-data-integrity
# 日曜 3:00 JST。DLsite の取り込みは 3 時台を飛ばしている。2:03 に始まった実行は、アプリの予算（55 分＝
# process-batch.ts の JOB_RUN_BUDGET）で 2:58 までに終わるので、同時には走らない（SPR-414）。
resource "google_cloud_scheduler_job" "data_integrity_check_weekly" {
  project = var.gcp_project_id
  region  = var.region
  name    = "data-integrity-check-weekly"

  description = "データ整合性チェック（毎週日曜日3:00 JST）"
  schedule    = "0 3 * * 0" # 毎週日曜日の3:00
  time_zone   = "Asia/Tokyo"
  paused      = false

  # ジョブの実行 API を直接呼ぶ（Pub/Sub と Eventarc を経由しない。DLsite のスケジューラと同じ形＝
  # function_dlsite_individual_info_api.tf）。本文は空の JSON（上書きは渡さない）。API は実行を始めたらすぐ返る。
  # スケジューラのリトライは既定（0 回）のまま。起動に失敗したら「実行が始まっていない」ので、アラートは鳴らない
  # （週 1 回の実行には、不在の検知が使えない＝monitoring_data_integrity.tf の冒頭）。月曜にログで確かめる運用は
  # 変わらない。
  http_target {
    http_method = "POST"
    body        = base64encode("{}")
    headers     = { "Content-Type" = "application/json" }
    uri         = "https://run.googleapis.com/v2/projects/${var.gcp_project_id}/locations/${google_cloud_run_v2_job.data_integrity.location}/jobs/${google_cloud_run_v2_job.data_integrity.name}:run"

    oauth_token {
      service_account_email = google_service_account.data_integrity_check_sa.email
    }
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_cloud_run_v2_job_iam_member.data_integrity_scheduler_invoker,
  ]
}

# 整合性チェックの実行用サービスアカウント（ジョブと旧 Functions の両方が使う。スケジューラがジョブを起動するときの主体でもある）
resource "google_service_account" "data_integrity_check_sa" {
  project      = var.gcp_project_id
  account_id   = "data-integrity-check-sa"
  display_name = "Data Integrity Check Function Service Account"
  description  = "データ整合性チェック関数用のサービスアカウント"
}

# Firestoreへのアクセス権限
resource "google_project_iam_member" "data_integrity_check_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.data_integrity_check_sa.email}"
}

# ログ書き込み権限
resource "google_project_iam_member" "data_integrity_check_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.data_integrity_check_sa.email}"
}

# ---- ここから下の Pub/Sub・Eventarc まわりは旧 Functions 用（戻すときのために残す＝SPR-419 まで） ----

# Cloud Scheduler から Pub/Sub への発行権限
resource "google_pubsub_topic_iam_member" "scheduler_data_integrity_pubsub_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.data_integrity_check_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# Pub/Sub サービスエージェントに Token Creator 権限を付与
# これにより、Pub/SubがOIDCトークンを作成してCloud Functionsを認証付きで呼び出せるようになる
resource "google_service_account_iam_member" "data_integrity_pubsub_token_creator" {
  service_account_id = google_service_account.data_integrity_check_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Cloud Run Invoker権限を付与（Cloud Functions Gen2で必要）
resource "google_project_iam_member" "data_integrity_check_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.data_integrity_check_sa.email}"
}

# Eventarc サービスエージェントに必要な権限を付与
resource "google_project_iam_member" "data_integrity_eventarc_receiver" {
  project = var.gcp_project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-eventarc.iam.gserviceaccount.com"
}

# Eventarc から Cloud Run への Invoker 権限
resource "google_project_iam_member" "data_integrity_eventarc_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-eventarc.iam.gserviceaccount.com"
}

# データ整合性チェック関数の出力情報
# 関数はGitHub Actionsでデプロイされるため、関数名のみ出力
output "data_integrity_check_function_info" {
  value = {
    name = local.data_integrity_check_function_name
    # 関数はGitHub Actionsでデプロイされるため、IDとURLは動的に決定されます
    note = "Function will be deployed via GitHub Actions"
  }
  description = "データ整合性チェック関数の情報"
}

# データ整合性チェックトピック情報
output "data_integrity_check_topic_info" {
  value = {
    name = google_pubsub_topic.data_integrity_check_trigger.name
    id   = google_pubsub_topic.data_integrity_check_trigger.id
  }
  description = "データ整合性チェック用Pub/Subトピックの情報"
}