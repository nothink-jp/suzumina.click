# ==============================================================================
# Discord認証コールバック関数 (v2 - HTTPSトリガー)
# ==============================================================================
# 概要: Discordのログインフロー完了後にコールバックを受け取り、Firebaseカスタムトークンを生成する関数
# ==============================================================================

# デプロイの共通設定（すべてのCloud Functionsで共有）
locals {
  discord_auth_function_name = "discordAuthCallback"
  discord_auth_runtime       = "nodejs20"
  discord_auth_entry_point   = "discordAuthCallback"
  discord_auth_memory        = "256Mi"
  discord_auth_timeout       = 60 # 秒
  
  # この関数が必要とする環境変数（シークレット）のリスト
  discord_auth_secrets = [
    "DISCORD_CLIENT_ID", 
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DISCORD_TARGET_GUILD_ID"
  ]
}

# Discord認証コールバック関数 (v2 - HTTPSトリガー)
resource "google_cloudfunctions2_function" "discord_auth_callback" {
  project  = var.gcp_project_id
  name     = local.discord_auth_function_name
  location = var.region

  # ビルド設定
  build_config {
    runtime     = local.discord_auth_runtime
    entry_point = local.discord_auth_entry_point
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source_archive.name
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1           # 最大インスタンス数
    min_instance_count = 0           # 最小インスタンス数（コールドスタートを許容）
    available_memory   = local.discord_auth_memory
    timeout_seconds    = local.discord_auth_timeout
    ingress_settings   = "ALLOW_ALL" # HTTPSトリガーのため全許可
    # 適切に命名されたサービスアカウントを使用
    service_account_email = google_service_account.discord_auth_callback_sa.email

    # シークレット環境変数を動的に設定
    dynamic "secret_environment_variables" {
      for_each = local.discord_auth_secrets
      content {
        key        = secret_environment_variables.value
        secret     = google_secret_manager_secret.secrets[secret_environment_variables.value].secret_id
        version    = "latest"
        project_id = var.gcp_project_id
      }
    }
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
    # この関数用のシークレット
    google_secret_manager_secret.secrets,
    # Firestore DB (関数ロジック変更時に間接的に必要になる可能性がある)
    google_firestore_database.database,
  ]
}

# Discord認証コールバック関数用のサービスアカウントにシークレットアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "discord_auth_secret_accessor" {
  for_each  = toset(local.discord_auth_secrets)
  
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets[each.value].secret_id
  role      = google_project_iam_custom_role.secret_manager_accessor_role.id
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.discord_auth_callback_sa,
    google_project_iam_custom_role.secret_manager_accessor_role
  ]
}

# Cloud Function の URL を出力
output "discord_auth_callback_url" {
  value       = google_cloudfunctions2_function.discord_auth_callback.service_config[0].uri
  description = "Discord認証コールバック関数のURL"
}