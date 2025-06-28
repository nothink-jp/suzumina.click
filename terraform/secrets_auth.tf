# ==============================================================================
# 認証関連Secret Manager設定
# ==============================================================================
# 概要: Discord OAuth認証とNextAuth用のシークレット管理
# ==============================================================================

# 認証関連シークレットのローカル変数
locals {
  # 認証関連シークレット定義
  auth_secrets = [
    {
      id          = "DISCORD_CLIENT_ID"
      description = "Discord OAuth Application Client ID"
      category    = "auth"
    },
    {
      id          = "DISCORD_CLIENT_SECRET"
      description = "Discord OAuth Application Client Secret"
      category    = "auth"
    },
    {
      id          = "DISCORD_BOT_TOKEN"
      description = "Discord Bot Token for guild member verification"
      category    = "auth"
    },
    {
      id          = "NEXTAUTH_SECRET"
      description = "NextAuth.js secret for JWT encryption"
      category    = "auth"
    },
    {
      id          = "DEFAULT_ADMIN_DISCORD_IDS"
      description = "Default admin Discord user IDs (comma separated)"
      category    = "auth"
    }
  ]
}

# 認証関連シークレットの作成
resource "google_secret_manager_secret" "auth_secrets" {
  for_each  = { for secret in local.auth_secrets : secret.id => secret }
  
  project   = var.gcp_project_id
  secret_id = each.key
  
  labels = merge(local.common_secret_settings.labels, {
    "category" = each.value.category
    "service"  = "nextjs-auth"
  })
  
  annotations = {
    description = each.value.description
  }

  replication {
    user_managed {
      replicas {
        location = local.common_secret_settings.replication_location
      }
    }
  }

  lifecycle {
    ignore_changes = [
      labels,
      annotations
    ]
  }

  depends_on = [google_project_service.secretmanager]
}

# 認証関連シークレットのバージョン作成（tfvars変数から値を設定）
resource "google_secret_manager_secret_version" "discord_client_id" {
  secret      = google_secret_manager_secret.auth_secrets["DISCORD_CLIENT_ID"].id
  secret_data = var.discord_client_id
}

resource "google_secret_manager_secret_version" "discord_client_secret" {
  secret      = google_secret_manager_secret.auth_secrets["DISCORD_CLIENT_SECRET"].id
  secret_data = var.discord_client_secret
}

resource "google_secret_manager_secret_version" "discord_bot_token" {
  count       = var.discord_bot_token != "" ? 1 : 0
  secret      = google_secret_manager_secret.auth_secrets["DISCORD_BOT_TOKEN"].id
  secret_data = var.discord_bot_token
}

resource "google_secret_manager_secret_version" "nextauth_secret" {
  secret      = google_secret_manager_secret.auth_secrets["NEXTAUTH_SECRET"].id
  secret_data = var.nextauth_secret
}

resource "google_secret_manager_secret_version" "default_admin_discord_ids" {
  secret      = google_secret_manager_secret.auth_secrets["DEFAULT_ADMIN_DISCORD_IDS"].id
  secret_data = var.default_admin_discord_ids
}

# Secret Manager読み取り権限をCloud Runサービスアカウントに付与
resource "google_secret_manager_secret_iam_member" "auth_secret_access" {
  for_each  = google_secret_manager_secret.auth_secrets
  
  project   = var.gcp_project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# YouTube API Key シークレットへのアクセス権限をCloud Runサービスアカウントに付与
resource "google_secret_manager_secret_iam_member" "youtube_api_key_access_for_cloud_run" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["YOUTUBE_API_KEY"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# 出力値 - 認証シークレットの設定状況
output "auth_secrets_info" {
  value = {
    for id, secret in google_secret_manager_secret.auth_secrets :
    id => {
      name = secret.name
      category = "auth"
    }
  }
  description = "作成された認証関連シークレットの一覧"
  sensitive   = false
}