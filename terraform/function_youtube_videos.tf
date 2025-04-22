# ==============================================================================
# YouTube動画取得関数 (v2 - Pub/Subトリガー)
# ==============================================================================
# 概要: YouTubeから最新の動画情報を定期的に取得しFirestoreに保存する関数
# ==============================================================================

# デプロイの共通設定
locals {
  youtube_function_name = "fetchYouTubeVideos"
  youtube_runtime       = "nodejs20"
  youtube_entry_point   = "fetchYouTubeVideos"
  youtube_memory        = "512Mi"
  youtube_timeout       = 540 # 秒（9分）- イベントトリガー制限に合わせる

  # この関数が必要とする環境変数（シークレット）のリスト
  youtube_secrets = [
    "YOUTUBE_API_KEY"
  ]
}

# YouTube動画取得関数 (v2 - Pub/Subトリガー)
resource "google_cloudfunctions2_function" "fetch_youtube_videos" {
  project  = var.gcp_project_id
  name     = local.youtube_function_name
  location = var.region

  # ビルド設定
  build_config {
    runtime     = local.youtube_runtime
    entry_point = local.youtube_entry_point
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1       # スケジュールタスクのため低めに設定
    min_instance_count = 0       # コールドスタートを許容
    available_memory   = local.youtube_memory
    timeout_seconds    = local.youtube_timeout
    # 専用のサービスアカウントを使用
    service_account_email = google_service_account.fetch_youtube_videos_sa.email

    # シークレット環境変数を動的に設定
    dynamic "secret_environment_variables" {
      for_each = local.youtube_secrets
      content {
        key        = secret_environment_variables.value
        secret     = google_secret_manager_secret.secrets[secret_environment_variables.value].secret_id
        version    = "latest"
        project_id = var.gcp_project_id
      }
    }
  }

  # イベントトリガー設定 (Pub/Sub)
  event_trigger {
    trigger_region = var.region # 関数のリージョンと一致させる
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.youtube_video_fetch_trigger.id
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY"
    # トリガー用にも同じ専用サービスアカウントを使用
    service_account_email = google_service_account.fetch_youtube_videos_sa.email
  }

  # GitHub Actions からのデプロイで関数コードのみの更新を許可するため、
  # ソースコードの変更は無視する（関数の設定変更のみをTerraformで管理）
  lifecycle {
    ignore_changes = [
      build_config.0.source.0.storage_source.0.object
      # labels と client は存在しない属性なので削除
    ]
  }

  depends_on = [
    # ソースコードのアップロード
    google_storage_bucket_object.function_source_archive,
    # 必要なAPIが有効化されていること
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.secretmanager,
    google_project_service.firestore,
    google_project_service.pubsub,
    # この関数に必要なFirestore DB、Pub/Subトピック、シークレット
    google_firestore_database.database,
    google_pubsub_topic.youtube_video_fetch_trigger,
    google_secret_manager_secret.secrets,
    google_project_iam_member.fetch_youtube_videos_firestore_user,
    google_project_iam_member.fetch_youtube_videos_log_writer,
    # サービスアカウントが存在することを確認
    google_service_account.fetch_youtube_videos_sa,
  ]
}

# YouTube動画取得関数用のサービスアカウントにシークレットアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "youtube_video_secret_accessor" {
  for_each  = toset(local.youtube_secrets)
  
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets[each.value].secret_id
  role      = google_project_iam_custom_role.secret_manager_accessor_role.id
  member    = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.fetch_youtube_videos_sa,
    google_project_iam_custom_role.secret_manager_accessor_role
  ]
}

# Cloud Function のリソース情報を出力
output "fetch_youtube_videos_function_info" {
  value = {
    name     = google_cloudfunctions2_function.fetch_youtube_videos.name
    location = google_cloudfunctions2_function.fetch_youtube_videos.location
    state    = google_cloudfunctions2_function.fetch_youtube_videos.state
  }
  description = "YouTube動画取得関数の情報"
}