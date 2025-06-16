# ==========================================================
# 音声ボタン機能用 Cloud Storage設定
# ==========================================================

# 音声ファイル保存用バケット
resource "google_storage_bucket" "audio_files" {
  name     = "${var.gcp_project_id}-audio-files"
  location = var.region

  # バケット設定
  uniform_bucket_level_access = true
  
  # バージョニング無効（音声ファイルは上書き更新しない）
  versioning {
    enabled = false
  }

  # ライフサイクル管理
  lifecycle_rule {
    # 1年後に自動削除
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }

  lifecycle_rule {
    # 30日後にNearlineに移行（アクセス頻度低下）
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    # 90日後にColdlineに移行（長期保存）
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age           = 90
      storage_class = "NEARLINE"
    }
  }

  # CORS設定（Web再生のため）
  cors {
    origin          = ["https://*.suzumina.click", "https://suzumina.click"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # 削除保護
  force_destroy = false

  labels = {
    environment = "production"
    service     = "suzumina-click"
    component   = "audio-storage"
    managed_by  = "terraform"
  }
}

# バケットの公開アクセス防止
resource "google_storage_bucket_iam_binding" "audio_files_prevent_public" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.legacyBucketReader"

  # 明示的に空のメンバーを設定（パブリックアクセス防止）
  members = []

  # 条件付きアクセス（必要に応じて）
  condition {
    title       = "prevent_public_access"
    description = "Prevent public access to audio files bucket"
    expression  = "false"  # 常にfalseでパブリックアクセスを無効化
  }
}

# Cloud Run Jobs用のバケットアクセス権限
resource "google_storage_bucket_iam_member" "audio_processor_access" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.audio_processor.email}"

  depends_on = [google_service_account.audio_processor]
}

# Web App（Next.js）用の読み取り専用アクセス
resource "google_storage_bucket_iam_member" "web_app_read_access" {
  bucket = google_storage_bucket.audio_files.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.web_app.email}"

  depends_on = [google_service_account.web_app]
}

# ==========================================================
# 音声処理用サービスアカウント
# ==========================================================

resource "google_service_account" "audio_processor" {
  account_id   = "audio-processor"
  display_name = "Audio Processor Service Account"
  description  = "Service account for Cloud Run Jobs audio processing"
}

# Audio Processor用の権限設定
resource "google_project_iam_member" "audio_processor_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.audio_processor.email}"
}

resource "google_project_iam_member" "audio_processor_logging" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.audio_processor.email}"
}

resource "google_project_iam_member" "audio_processor_monitoring" {
  project = var.gcp_project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.audio_processor.email}"
}

# ==========================================================
# Web App用サービスアカウント（音声ファイルアクセス用）
# ==========================================================

resource "google_service_account" "web_app" {
  account_id   = "web-app-audio"
  display_name = "Web App Audio Access Service Account"
  description  = "Service account for web app to access audio files"
}

# Web App用の最小権限設定
resource "google_project_iam_member" "web_app_storage_viewer" {
  project = var.gcp_project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.web_app.email}"
}

# ==========================================================
# 出力値
# ==========================================================

output "audio_bucket_name" {
  description = "音声ファイル保存用バケット名"
  value       = google_storage_bucket.audio_files.name
}

output "audio_bucket_url" {
  description = "音声ファイル保存用バケットURL"
  value       = "gs://${google_storage_bucket.audio_files.name}"
}

output "audio_processor_service_account_email" {
  description = "音声処理用サービスアカウントメール"
  value       = google_service_account.audio_processor.email
}

output "web_app_service_account_email" {
  description = "Web App用サービスアカウントメール"
  value       = google_service_account.web_app.email
}