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

  # すべてのシークレットをまとめる（YouTube APIキーのみ残存）
  all_secrets = local.api_secrets
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
    "category" = "api"  # 現在はAPIキーのみが残存
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
      category = "api"  # 現在はAPIキーのみが残存
    }
  }
  description = "作成されたシークレットの一覧"
  sensitive   = false  # シークレットの値ではなくメタデータのみなので非センシティブ
}