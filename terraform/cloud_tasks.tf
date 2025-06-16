# ==========================================================
# Cloud Tasks設定（音声処理キュー）
# ==========================================================

# 音声処理専用キュー
resource "google_cloud_tasks_queue" "audio_processing" {
  name     = "audio-processing-queue"
  location = var.region

  # レート制限設定
  rate_limits {
    max_dispatches_per_second = 1.0  # 1秒に1タスク（音声処理は重い処理のため）
    max_burst_size           = 5     # バーストで最大5タスク
    max_concurrent_dispatches = 3    # 同時実行最大3タスク
  }

  # リトライ設定
  retry_config {
    max_attempts       = 3
    max_retry_duration = "1800s"  # 30分
    max_backoff        = "300s"   # 最大5分待機
    min_backoff        = "60s"    # 最小1分待機
    max_doublings      = 3
  }

  # Cloud Run Jobs統合設定
  app_engine_routing_override {
    service = "default"
  }

  labels = {
    environment = "production"
    service     = "suzumina-click"
    component   = "audio-processing"
    managed_by  = "terraform"
  }
}

# ==========================================================
# Cloud Functions → Cloud Run Jobs統合用設定
# ==========================================================

# 音声処理タスク送信用のサービスアカウント
resource "google_service_account" "task_enqueuer" {
  account_id   = "task-enqueuer"
  display_name = "Cloud Tasks Enqueuer Service Account"
  description  = "Service account for enqueueing audio processing tasks"
}

# Cloud Tasks操作権限
resource "google_project_iam_member" "task_enqueuer_tasks" {
  project = var.gcp_project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.task_enqueuer.email}"
}

# Cloud Run Jobs実行権限
resource "google_project_iam_member" "task_enqueuer_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.task_enqueuer.email}"
}

# 既存のCloud Functions用サービスアカウントにタスク送信権限を追加
# （YouTube動画取得後に音声処理タスクを送信するため）
resource "google_project_iam_member" "youtube_function_task_enqueuer" {
  project = var.gcp_project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.youtube_videos_function.email}"

  depends_on = [google_service_account.youtube_videos_function]
}

# ==========================================================
# Cloud Run Jobs設定
# ==========================================================

resource "google_cloud_run_v2_job" "audio_processor" {
  name     = "audio-processor"
  location = var.region

  template {
    # 並列実行設定
    parallelism = 1  # 1度に1つのタスクのみ実行
    task_count  = 1  # 1タスクあたり1つのコンテナ

    template {
      # リソース設定
      max_retries = 1
      timeout     = "3600s"  # 1時間

      containers {
        image = "gcr.io/${var.gcp_project_id}/audio-processor:latest"

        # リソース制限
        resources {
          limits = {
            cpu    = "4"
            memory = "16Gi"
          }
        }

        # 環境変数設定
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.gcp_project_id
        }

        env {
          name  = "AUDIO_BUCKET_NAME"
          value = google_storage_bucket.audio_files.name
        }

        env {
          name  = "FIRESTORE_DATABASE"
          value = "(default)"
        }

        env {
          name  = "CLOUD_RUN_JOB"
          value = "true"
        }

        env {
          name  = "LOG_LEVEL"
          value = "INFO"
        }

        env {
          name  = "MAX_AUDIO_BUTTONS"
          value = "20"
        }

        env {
          name  = "OPUS_BITRATE"
          value = "128k"
        }

        env {
          name  = "AAC_BITRATE"
          value = "128k"
        }

        # ポート設定（Cloud Tasksからのリクエスト受信用）
        ports {
          container_port = 8080
        }
      }

      # サービスアカウント設定
      service_account = google_service_account.audio_processor.email

      # 実行環境設定
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    }
  }

  labels = {
    environment = "production"
    service     = "suzumina-click"
    component   = "audio-processor"
    managed_by  = "terraform"
  }

  depends_on = [
    google_service_account.audio_processor,
    google_storage_bucket.audio_files
  ]
}

# Cloud Run Jobs実行権限
resource "google_cloud_run_v2_job_iam_member" "audio_processor_invoker" {
  project = google_cloud_run_v2_job.audio_processor.project
  location = google_cloud_run_v2_job.audio_processor.location
  name    = google_cloud_run_v2_job.audio_processor.name
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.task_enqueuer.email}"
}

# ==========================================================
# 出力値
# ==========================================================

output "audio_processing_queue_name" {
  description = "音声処理用Cloud Tasksキュー名"
  value       = google_cloud_tasks_queue.audio_processing.name
}

output "audio_processing_queue_full_name" {
  description = "音声処理用Cloud Tasksキュー完全名"
  value       = "projects/${var.gcp_project_id}/locations/${var.region}/queues/${google_cloud_tasks_queue.audio_processing.name}"
}

output "cloud_run_job_name" {
  description = "音声処理用Cloud Run Jobs名"
  value       = google_cloud_run_v2_job.audio_processor.name
}

output "cloud_run_job_uri" {
  description = "音声処理用Cloud Run Jobs URI"
  value       = "https://${google_cloud_run_v2_job.audio_processor.name}-${random_id.suffix.hex}.${var.region}.run.app"
}

output "task_enqueuer_service_account_email" {
  description = "タスク送信用サービスアカウントメール"
  value       = google_service_account.task_enqueuer.email
}

# ランダムサフィックス生成（Cloud Run URIユニーク化）
resource "random_id" "suffix" {
  byte_length = 4
}