# ==============================================================================
# データ整合性検証機能
# ==============================================================================
# 概要: 週次で実行されるデータ整合性チェック
# - CircleのworkIds配列の整合性
# - 孤立したCreatorマッピングのクリーンアップ  
# - Work-Circle相互参照の整合性
# ==============================================================================

# データ整合性チェック関数の設定
locals {
  data_integrity_check_function_name = "checkDataIntegrity"
  data_integrity_check_runtime       = "nodejs22"
  data_integrity_check_entry_point   = "checkDataIntegrity"
  data_integrity_check_memory        = "512Mi"  # 整合性チェックは軽量処理
  data_integrity_check_timeout       = 540      # 9分タイムアウト
}

# データ整合性チェック関数（Gen2）
# 注意: 関数自体はGitHub Actionsでデプロイされるため、
# Terraformではインフラストラクチャのみを管理します。
# 
# 関数のデプロイは以下の手順で行われます：
# 1. terraform apply でサービスアカウント、Pub/Subトピック、Cloud Schedulerを作成
# 2. GitHub ActionsのCloud Functionsデプロイワークフローで関数をデプロイ
#
# resource "google_cloudfunctions2_function" "check_data_integrity" {
#   # この関数リソースはコメントアウトされています。
#   # GitHub Actionsによるデプロイとの競合を避けるためです。
# }

# データ整合性チェック用のPub/Subトピック
resource "google_pubsub_topic" "data_integrity_check_trigger" {
  project = var.gcp_project_id
  name    = "data-integrity-check-trigger"
  
  labels = {
    environment    = var.environment
    function       = "data-integrity-check"
    managed-by     = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# データ整合性チェック用のCloud Scheduler（週次実行）
resource "google_cloud_scheduler_job" "data_integrity_check_weekly" {
  project  = var.gcp_project_id
  region   = var.region
  name     = "data-integrity-check-weekly"
  
  description = "データ整合性チェック（毎週日曜日3:00 JST）"
  schedule    = "0 3 * * 0"  # 毎週日曜日の3:00
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.data_integrity_check_trigger.id
    data       = base64encode(jsonencode({
      type = "data_integrity_check"
      description = "週次データ整合性チェック"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.data_integrity_check_trigger,
  ]
}

# データ整合性チェック関数用のサービスアカウント
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

# Cloud Scheduler から Pub/Sub への発行権限
resource "google_pubsub_topic_iam_member" "scheduler_data_integrity_pubsub_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.data_integrity_check_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
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