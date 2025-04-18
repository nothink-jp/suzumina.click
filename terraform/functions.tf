# Functions のソースコードを zip アーカイブ
data "archive_file" "function_source_zip" {
  type        = "zip"
  source_dir  = "../functions" # ルートディレクトリからの相対パス
  output_path = "/tmp/function-source-${var.gcp_project_id}.zip" # 一時的な出力先

  # node_modules など不要なファイルを除外 (firebase.json の ignore と合わせる)
  excludes = [
    ".git",
    "node_modules",
    "firebase-debug.log",
    "firebase-debug.*.log",
    "*.local",
    ".gitignore", # .gitignore 自体も除外
    "package-lock.json", # pnpm を使っているので除外
    ".env*", # 環境変数ファイル
    "*.tsbuildinfo",
    ".DS_Store",
    ".firebase",
    ".vscode",
  ]
  # Removed incorrect triggers block
}

# zip アーカイブを GCS バケットにアップロード
resource "google_storage_bucket_object" "function_source_archive" {
  # Include hash of the built JS file in the object name to force updates
  name   = "source-${filesha256("../functions/lib/index.js")}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source_zip.output_path # archive_file の出力パス

  # archive_file が完了してから実行
  depends_on = [data.archive_file.function_source_zip]
}

# ------------------------------------------------------------------------------
# discordAuthCallback Cloud Function (v2 - HTTPS Trigger)
resource "google_cloudfunctions2_function" "discord_auth_callback" {
  project  = var.gcp_project_id
  name     = "discordAuthCallback"
  location = "asia-northeast1" # firebase.json と同じリージョン

  # ビルド設定
  build_config {
    runtime     = "nodejs20" # 使用する Node.js のバージョン
    entry_point = "discordAuthCallback" # index.ts で export されている関数名
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name # Reference updated object name
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1 # 必要に応じて調整
    min_instance_count = 0 # コールドスタートを許容する場合
    available_memory   = "256Mi"
    timeout_seconds    = 60 # 必要に応じて調整
    ingress_settings   = "ALLOW_ALL" # HTTPS トリガーのため全許可
    # Use the correctly named service account
    service_account_email = google_service_account.discord_auth_callback_sa.email

    # シークレット設定 (値は Secret Manager から取得)
    secret_environment_variables {
      key        = "DISCORD_CLIENT_ID"
      secret     = google_secret_manager_secret.discord_client_id.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_CLIENT_SECRET"
      secret     = google_secret_manager_secret.discord_client_secret.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_REDIRECT_URI"
      secret     = google_secret_manager_secret.discord_redirect_uri.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_TARGET_GUILD_ID"
      secret     = google_secret_manager_secret.discord_target_guild_id.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
  }

  depends_on = [
    # Source code upload
    google_storage_bucket_object.function_source_archive,
    # Required APIs enabled
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.secretmanager,
    # Secrets and IAM bindings for this function
    google_secret_manager_secret_iam_member.discord_client_id_accessor,
    google_secret_manager_secret_iam_member.discord_client_secret_accessor,
    google_secret_manager_secret_iam_member.discord_redirect_uri_accessor,
    google_secret_manager_secret_iam_member.discord_target_guild_id_accessor,
    # Firestore DB (might be needed indirectly if function logic changes)
    google_firestore_database.database,
  ]
}

# ------------------------------------------------------------------------------
# fetchYouTubeVideos Cloud Function (v2 - Pub/Sub Trigger)
resource "google_cloudfunctions2_function" "fetch_youtube_videos" {
  project  = var.gcp_project_id
  name     = "fetchYouTubeVideos"
  location = "asia-northeast1"

  # ビルド設定
  build_config {
    runtime     = "nodejs20"
    entry_point = "fetchYouTubeVideos" # Assumed entry point name in index.ts
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name # Reference updated object name
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1       # Keep low for scheduled task
    min_instance_count = 0
    available_memory   = "512Mi" # Corrected unit to Mi
    timeout_seconds    = 540     # Increased timeout from previous version (9 min)
    # Use the dedicated service account
    service_account_email = google_service_account.fetch_youtube_videos_sa.email

    # Secret for YouTube API Key
    secret_environment_variables {
      key        = "YOUTUBE_API_KEY"
      secret     = google_secret_manager_secret.youtube_api_key.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
  }

  # イベントトリガー設定 (Pub/Sub)
  event_trigger {
    trigger_region = "asia-northeast1" # Should match function location
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.youtube_video_fetch_trigger.id # Reference the topic
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY" # Or RETRY_POLICY_RETRY if needed
    # Use the dedicated service account for the trigger as well
    service_account_email = google_service_account.fetch_youtube_videos_sa.email
  }

  depends_on = [
    # Source code upload
    google_storage_bucket_object.function_source_archive,
    # Required APIs enabled
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.secretmanager,
    google_project_service.firestore,
    google_project_service.pubsub,
    # Firestore DB, Pub/Sub Topic, Secret, and IAM bindings for this function
    google_firestore_database.database,
    google_pubsub_topic.youtube_video_fetch_trigger,
    google_secret_manager_secret_iam_member.youtube_api_key_accessor,
    google_project_iam_member.fetch_youtube_videos_firestore_user,
    google_project_iam_member.fetch_youtube_videos_log_writer,
    # Ensure the service account exists
    google_service_account.fetch_youtube_videos_sa,
  ]
}