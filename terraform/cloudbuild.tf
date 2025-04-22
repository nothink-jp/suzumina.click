# Cloud Buildトリガーの設定（手動実行用）
resource "google_cloudbuild_trigger" "manual_trigger" {
  name        = "suzumina-click-manual-trigger"
  description = "手動で評価環境へのデプロイをトリガーする"
  
  # トリガー設定
  trigger_template {
    branch_name = "main"
    repo_name   = "suzumina.click"
  }
  
  # ビルド設定ファイル
  filename = "cloudbuild.yaml"
  
  # 変数設定
  substitutions = {
    _DEPLOY_ENV = "evaluation"
    _NOTIFICATION_TOPIC = "cloud-builds"
  }
}

# GitHub Actionsから呼び出されるトリガー
resource "google_cloudbuild_trigger" "github_actions_trigger" {
  name        = "suzumina-click-github-actions-trigger"
  description = "GitHub Actionsから呼び出されるビルドトリガー"
  
  # トリガー設定
  github {
    owner = "nothink-jp"
    name  = "suzumina.click"
    push {
      branch = "main"
    }
  }
  
  # ビルド設定ファイル
  filename = "cloudbuild.yaml"
  
  # 変数設定
  substitutions = {
    _DEPLOY_ENV = "evaluation"
  }
}

# ビルド結果通知用のPub/Subトピック
resource "google_pubsub_topic" "cloud_build_notifications" {
  name = "cloud-builds"
  
  # メッセージ保持期間を設定 (3日間)
  message_retention_duration = "259200s"  # 3日間（秒単位）
}

# Cloud BuildサービスアカウントにCloud Run管理権限を付与
resource "google_project_iam_member" "cloudbuild_cloudrun_admin" {
  project = var.gcp_project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# Cloud BuildサービスアカウントにStorage権限を付与（コンテナイメージの管理用）
resource "google_project_iam_member" "cloudbuild_storage_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# Cloud BuildサービスアカウントにService Account User権限を付与
resource "google_project_iam_member" "cloudbuild_service_account_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# Cloud Build通知でログを監視するIAM権限
resource "google_project_iam_member" "cloudbuild_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# Cloud BuildサービスアカウントにPub/Sub Publisher権限を付与（通知用）
resource "google_pubsub_topic_iam_member" "cloudbuild_pubsub_publisher" {
  project = google_pubsub_topic.cloud_build_notifications.project
  topic   = google_pubsub_topic.cloud_build_notifications.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
  
  depends_on = [google_pubsub_topic.cloud_build_notifications]
}