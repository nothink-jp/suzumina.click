# ==========================================================
# ストレージリソース定義
# ==========================================================
# 注: GitHub Actionsへの移行（2025年5月2日）により
# ビルド関連のリソースはCI/CDパイプラインで管理されるようになりました。
# このファイルでのCloud Functions用バケット定義は削除し、
# function_common.tfに一元化しています。
# ==========================================================

# 音声ファイル用Cloud Storageバケット
resource "google_storage_bucket" "audio_files" {
  name     = "${var.gcp_project_id}-audio-files"
  location = var.region

  # バージョニング設定
  versioning {
    enabled = false
  }

  # CORS設定（ブラウザから直接アクセス用）
  cors {
    origin          = ["https://${var.domain_name}", "http://localhost:3000"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # ライフサイクル管理
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud Functions デプロイ用 Storage バケット
resource "google_storage_bucket" "functions_deployment" {
  name     = "${var.gcp_project_id}-functions-deployment"
  location = var.region

  # バケットのライフサイクル管理
  lifecycle_rule {
    condition {
      age = 30 # 30日以上古いファイルを削除
    }
    action {
      type = "Delete"
    }
  }

  # バージョニングを無効化（デプロイファイルは履歴不要）
  versioning {
    enabled = false
  }

  # 均一なバケットレベルアクセス制御を有効化
  uniform_bucket_level_access = true

  labels = {
    purpose = "cloud-functions-deployment"
    env     = var.environment
  }
}

# ==========================================================
# IAM for Storage
# ==========================================================

# ----------------------------------------------------------
# audio_files バケット用 IAM
# ----------------------------------------------------------

# Web App用サービスアカウントに書き込み権限を付与
resource "google_storage_bucket_iam_member" "audio_files_web_creator" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# Functions用サービスアカウントに書き込み権限を付与
resource "google_storage_bucket_iam_member" "audio_files_youtube_function_write" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"
}

resource "google_storage_bucket_iam_member" "audio_files_dlsite_function_write" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.fetch_dlsite_works_sa.email}"
}

# ----------------------------------------------------------
# functions_deployment バケット用 IAM
# ----------------------------------------------------------

# Cloud Functions デプロイ用サービスアカウントにバケットへのアクセス権限を付与
resource "google_storage_bucket_iam_member" "functions_deployer_storage_admin" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# Cloud Functions デプロイ用サービスアカウントにバケット一覧表示権限を付与
resource "google_storage_bucket_iam_member" "functions_deployer_storage_viewer" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# ==========================================================
# Outputs
# ==========================================================

# バケットの存在確認用の出力
output "functions_deployment_bucket" {
  description = "Cloud Functions デプロイ用 Storage バケット名"
  value       = google_storage_bucket.functions_deployment.name
}
