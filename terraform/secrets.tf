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
      "project"    = "suzumina-click"
    }
  }

  # Discord認証関連シークレット
  discord_secrets = [
    {
      id          = "DISCORD_CLIENT_ID"
      description = "Discord OAuthアプリケーションのクライアントID"
    },
    {
      id          = "DISCORD_CLIENT_SECRET"
      description = "Discord OAuthアプリケーションのクライアントシークレット"
    },
    {
      id          = "DISCORD_REDIRECT_URI"
      description = "Discord認証後のリダイレクトURI"
    },
    {
      id          = "DISCORD_TARGET_GUILD_ID"
      description = "メンバーシップ確認対象のDiscordサーバー（ギルド）ID"
    }
  ]

  # API関連シークレット
  api_secrets = [
    {
      id          = "YOUTUBE_API_KEY"
      description = "YouTube Data APIキー"
    }
  ]

  # すべてのシークレットをまとめる
  all_secrets = concat(local.discord_secrets, local.api_secrets)
}

# シークレットの作成
# 注: 既存のシークレットがある場合は、先に以下のコマンドでインポートしてください:
# terraform import 'google_secret_manager_secret.secrets["DISCORD_CLIENT_ID"]' projects/suzumina-click-firebase/secrets/DISCORD_CLIENT_ID
resource "google_secret_manager_secret" "secrets" {
  for_each  = { for secret in local.all_secrets : secret.id => secret }
  
  project   = var.gcp_project_id
  secret_id = each.key
  
  # メタデータとしてシークレットの説明を追加
  labels = merge(local.common_secret_settings.labels, {
    "category" = contains([for s in local.discord_secrets : s.id], each.key) ? "discord" : "api"
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
      category = contains([for s in local.discord_secrets : s.id], id) ? "discord" : "api"
    }
  }
  description = "作成されたシークレットの一覧"
  sensitive   = false  # シークレットの値ではなくメタデータのみなので非センシティブ
}