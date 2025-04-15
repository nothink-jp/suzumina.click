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
}

# zip アーカイブを GCS バケットにアップロード
resource "google_storage_bucket_object" "function_source_archive" {
  name   = "source.zip" # バケット内のオブジェクト名
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source_zip.output_path # archive_file の出力パス

  # archive_file が完了してから実行
  depends_on = [data.archive_file.function_source_zip]
}

# discordAuthCallback Cloud Function (v2)
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
        object = google_storage_bucket_object.function_source_archive.name
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1 # 必要に応じて調整
    min_instance_count = 0 # コールドスタートを許容する場合
    available_memory   = "256Mi" # Corrected unit to Mi
    timeout_seconds    = 60 # 必要に応じて調整
    ingress_settings   = "ALLOW_ALL" # HTTPS トリガーのため全許可
    service_account_email = google_service_account.function_identity.email # 作成したサービスアカウントを使用

    # シークレット設定 (値は Secret Manager から取得)
    secret_environment_variables {
      key        = "DISCORD_CLIENT_ID"
      secret     = google_secret_manager_secret.discord_client_id.secret_id # リソース参照に変更
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_CLIENT_SECRET"
      secret     = google_secret_manager_secret.discord_client_secret.secret_id # リソース参照に変更
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_REDIRECT_URI"
      secret     = google_secret_manager_secret.discord_redirect_uri.secret_id # リソース参照に変更
      version    = "latest"
      project_id = var.gcp_project_id
    }
    secret_environment_variables {
      key        = "DISCORD_TARGET_GUILD_ID"
      secret     = google_secret_manager_secret.discord_target_guild_id.secret_id # リソース参照に変更
      version    = "latest"
      project_id = var.gcp_project_id
    }
  }

  # event_trigger ブロックは v2 HTTPS 関数では不要なため削除

  depends_on = [
    # ソースコードのアップロードが完了してから
    google_storage_bucket_object.function_source_archive,
    # 必要な API が有効になってから
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.secretmanager,
    # シークレットと IAM 権限が設定されてから
    google_secret_manager_secret_iam_member.discord_client_id_accessor,
    google_secret_manager_secret_iam_member.discord_client_secret_accessor,
    google_secret_manager_secret_iam_member.discord_redirect_uri_accessor,
    google_secret_manager_secret_iam_member.discord_target_guild_id_accessor,
  ]
}