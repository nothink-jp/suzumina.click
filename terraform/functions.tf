# Functions のソースコードを zip アーカイブ
data "archive_file" "function_source_zip" {
  type        = "zip"
  source_dir  = "../functions"                                   # ルートディレクトリからの相対パス
  output_path = "/tmp/function-source-${var.gcp_project_id}.zip" # 一時的な出力先

  # node_modules など不要なファイルを除外 (firebase.json の ignore と合わせる)
  excludes = [
    ".git",
    "node_modules",
    "firebase-debug.log",
    "firebase-debug.*.log",
    "*.local",
    ".gitignore",        # .gitignore 自体も除外
    "package-lock.json", # pnpm を使っているので除外
    ".env*",             # 環境変数ファイル
    "*.tsbuildinfo",
    ".DS_Store",
    ".firebase",
    ".vscode",
  ]
  # 不正なtriggersブロックは削除済み
}

# zip アーカイブを GCS バケットにアップロード
resource "google_storage_bucket_object" "function_source_archive" {
  # ビルド済みJSファイルのハッシュ値を含めてファイル名を設定（更新を強制するため）
  name   = "source-${filesha256("../functions/lib/index.js")}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source_zip.output_path # archive_file の出力パス

  # archive_file が完了してから実行
  depends_on = [data.archive_file.function_source_zip]
}

# ------------------------------------------------------------------------------
# Discord認証コールバック関数 (v2 - HTTPSトリガー)
# ------------------------------------------------------------------------------
resource "google_cloudfunctions2_function" "discord_auth_callback" {
  project  = var.gcp_project_id
  name     = "discordAuthCallback"
  location = "asia-northeast1" # firebase.json と同じリージョン

  # ビルド設定
  build_config {
    runtime     = "nodejs20"            # 使用する Node.js のバージョン
    entry_point = "discordAuthCallback" # index.ts で export されている関数名
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name # 更新されたオブジェクト名を参照
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1           # 最大インスタンス数
    min_instance_count = 0           # 最小インスタンス数（コールドスタートを許容）
    available_memory   = "256Mi"     # メモリ割り当て
    timeout_seconds    = 60          # 関数のタイムアウト時間
    ingress_settings   = "ALLOW_ALL" # HTTPSトリガーのため全許可
    # 適切に命名されたサービスアカウントを使用
    service_account_email = google_service_account.discord_auth_callback_sa.email

    # シークレット設定 (値は Secret Manager から取得)
    secret_environment_variables {
      key        = "DISCORD_CLIENT_ID"
      secret     = google_secret_manager_secret.discord_client_id.secret_id
      version    = "latest" # 最新バージョンを使用
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
    # ソースコードのアップロード
    google_storage_bucket_object.function_source_archive,
    # 必要なAPIが有効化されていること
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.secretmanager,
    # この関数用のシークレットとIAMバインディング
    google_secret_manager_secret_iam_member.discord_client_id_accessor,
    google_secret_manager_secret_iam_member.discord_client_secret_accessor,
    google_secret_manager_secret_iam_member.discord_redirect_uri_accessor,
    google_secret_manager_secret_iam_member.discord_target_guild_id_accessor,
    # Firestore DB (関数ロジック変更時に間接的に必要になる可能性がある)
    google_firestore_database.database,
  ]
}

# ------------------------------------------------------------------------------
# YouTube動画取得関数 (v2 - Pub/Subトリガー)
# ------------------------------------------------------------------------------
resource "google_cloudfunctions2_function" "fetch_youtube_videos" {
  project  = var.gcp_project_id
  name     = "fetchYouTubeVideos"
  location = "asia-northeast1" # 東京リージョン

  # ビルド設定
  build_config {
    runtime     = "nodejs20"           # Node.js 20ランタイム
    entry_point = "fetchYouTubeVideos" # index.tsでエクスポートされている関数名
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name # 更新されたオブジェクト名を参照
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1       # スケジュールタスクのため低めに設定
    min_instance_count = 0       # コールドスタートを許容
    available_memory   = "512Mi" # メモリ割り当て（単位はMi）
    timeout_seconds    = 540     # タイムアウトを540秒（9分）に制限（イベントトリガー制限に合わせる）
    # 専用のサービスアカウントを使用
    service_account_email = google_service_account.fetch_youtube_videos_sa.email

    # YouTube API キーのシークレット環境変数
    secret_environment_variables {
      key        = "YOUTUBE_API_KEY"
      secret     = google_secret_manager_secret.youtube_api_key.secret_id
      version    = "latest"
      project_id = var.gcp_project_id
    }
  }

  # イベントトリガー設定 (Pub/Sub)
  event_trigger {
    trigger_region = "asia-northeast1" # 関数のリージョンと一致させる
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.youtube_video_fetch_trigger.id # トピックを参照
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY"                        # 必要に応じてRETRY_POLICY_RETRYも選択可
    # トリガー用にも同じ専用サービスアカウントを使用
    service_account_email = google_service_account.fetch_youtube_videos_sa.email
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
    # この関数に必要なFirestore DB、Pub/Subトピック、シークレット、IAMバインディング
    google_firestore_database.database,
    google_pubsub_topic.youtube_video_fetch_trigger,
    google_secret_manager_secret_iam_member.youtube_api_key_accessor,
    google_project_iam_member.fetch_youtube_videos_firestore_user,
    google_project_iam_member.fetch_youtube_videos_log_writer,
    # サービスアカウントが存在することを確認
    google_service_account.fetch_youtube_videos_sa,
  ]
}
