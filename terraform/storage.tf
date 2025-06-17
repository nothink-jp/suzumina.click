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

  # パブリックアクセス許可（音声ファイルは公開される）
  public_access_prevention = "inherited"
}

# 音声ファイル用バケットのIAM設定
resource "google_storage_bucket_iam_member" "audio_files_public_read" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Functions用サービスアカウントに書き込み権限
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

# Web App用サービスアカウントに書き込み権限
resource "google_storage_bucket_iam_member" "audio_files_web_write" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.gcp_project_id}@appspot.gserviceaccount.com"
}
