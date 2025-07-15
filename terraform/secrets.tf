# ==============================================================================
# Secret Manager 設定
# ==============================================================================
# 概要: アプリケーションで使用する環境変数・シークレットの管理
# 注: APIの有効化は api_services.tf で一元管理されています
# ==============================================================================

# シークレット定義のためのローカル変数
locals {
  # すべてのシークレットに共通の設定
  common_secret_settings = {
    replication_location = "asia-northeast1"  # 東京リージョン
    labels = {
      "managed-by" = "terraform"
      "project"    = local.project_id
    }
  }

  # API関連シークレット
  api_secrets = [
    {
      id          = "YOUTUBE_API_KEY"
      description = "YouTube Data APIキー"
    }
  ]

  # 認証関連シークレット
  auth_secrets = [
    {
      id          = "DISCORD_CLIENT_ID"
      description = "Discord OAuth Client ID"
    },
    {
      id          = "DISCORD_CLIENT_SECRET"
      description = "Discord OAuth Client Secret"
    },
    {
      id          = "NEXTAUTH_SECRET"
      description = "NextAuth.js encryption secret"
    }
  ]

  # メール関連シークレット
  email_secrets = [
    {
      id          = "RESEND_API_KEY"
      description = "Resend API key for email sending"
    },
    {
      id          = "CONTACT_EMAIL_RECIPIENTS"
      description = "Email recipients for contact form notifications"
    }
  ]

  # すべてのシークレットをまとめる
  all_secrets = concat(local.api_secrets, local.auth_secrets, local.email_secrets)
}

# シークレットの作成
# 注: 既存のシークレットがある場合は、先に以下のコマンドでインポートしてください:
# terraform import 'google_secret_manager_secret.secrets["YOUTUBE_API_KEY"]' projects/${local.project_id}/secrets/YOUTUBE_API_KEY
resource "google_secret_manager_secret" "secrets" {
  for_each  = { for secret in local.all_secrets : secret.id => secret }
  
  project   = var.gcp_project_id
  secret_id = each.key
  
  # メタデータとしてシークレットの説明を追加
  labels = merge(local.common_secret_settings.labels, {
    "category" = contains(["YOUTUBE_API_KEY"], each.key) ? "api" : contains(["RESEND_API_KEY", "CONTACT_EMAIL_RECIPIENTS"], each.key) ? "email" : "auth"
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

  # リソース削除のため、prevent_destroyを無効化
  lifecycle {
    # prevent_destroy = true  # 削除保護を解除（コメントアウト）
    # シークレットの内容（バージョン）は他の方法で管理されるため無視
    ignore_changes = [
      labels,
      annotations
    ]
  }

  # api_services.tfで定義されているgoogle_project_service.secretmanagerを参照
  depends_on = [google_project_service.secretmanager]
}

# シークレットバージョンの作成
resource "google_secret_manager_secret_version" "secret_versions" {
  for_each = {
    "DISCORD_CLIENT_ID"         = var.discord_client_id
    "DISCORD_CLIENT_SECRET"     = var.discord_client_secret
    "NEXTAUTH_SECRET"           = var.nextauth_secret
    "YOUTUBE_API_KEY"           = var.youtube_api_key
    "RESEND_API_KEY"            = var.resend_api_key
    "CONTACT_EMAIL_RECIPIENTS"  = var.contact_email_recipients
  }

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value

  depends_on = [google_secret_manager_secret.secrets]
}

# シークレットアクセス・管理用のカスタムロール
resource "google_project_iam_custom_role" "secret_manager_accessor_role" {
  project     = var.gcp_project_id
  role_id     = "secretManagerAccessor"
  title       = "Secret Manager Accessor Role"
  description = "カスタムロールでSecret Managerへのアクセスのみを許可"
  permissions = [
    "secretmanager.secrets.get",
    "secretmanager.versions.access",
    "secretmanager.versions.get"
  ]
}

# 出力値 - シークレットの設定状況
output "secrets_info" {
  value = {
    for id, secret in google_secret_manager_secret.secrets :
    id => {
      name = secret.name
      category = contains(["YOUTUBE_API_KEY"], id) ? "api" : contains(["RESEND_API_KEY", "CONTACT_EMAIL_RECIPIENTS"], id) ? "email" : "auth"
    }
  }
  description = "作成されたシークレットの一覧"
  sensitive   = false  # シークレットの値ではなくメタデータのみなので非センシティブ
}