# ==============================================================================
# Cloud Run サービス設定
# ==============================================================================
# 概要: Next.jsアプリケーションのホスティング用Cloud Runサービス
# ==============================================================================

# Cloud Run サービスの設定
locals {
  cloudrun_service_name = "suzumina-click-nextjs-app"
  cloudrun_container_port = 8080
  cloudrun_cpu_limit = "1000m"  # 1 vCPU
  cloudrun_memory_limit = "512Mi"  # 512 MB
  # 初期デプロイ時のダミーイメージ
  cloudrun_initial_image = "gcr.io/cloudrun/hello"
  # デプロイ後にGitHub Actionsで更新される
  # Discord認証に必要なシークレット
  discord_auth_secrets = [
    "NEXT_PUBLIC_DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "NEXT_PUBLIC_DISCORD_REDIRECT_URI",
    "DISCORD_TARGET_GUILD_ID",
    "FIREBASE_SERVICE_ACCOUNT_KEY"
  ]
  # クライアントサイド用Firebase設定のキー
  firebase_client_keys = [
    "API_KEY",
    "AUTH_DOMAIN",
    "PROJECT_ID",
    "STORAGE_BUCKET",
    "MESSAGING_SENDER_ID",
    "APP_ID",
    "MEASUREMENT_ID"
  ]
}

# Cloud Run用のサービスアカウント
resource "google_service_account" "nextjs_app_sa" {
  project      = var.gcp_project_id
  account_id   = "nextjs-app-sa"
  display_name = "Next.js App Service Account"
  description  = "Next.jsアプリケーション用のサービスアカウント（Discord認証を含む）"
}

# サービスアカウントにSecret Managerへのアクセス権限を付与
resource "google_project_iam_member" "nextjs_app_secretmanager_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.nextjs_app_sa.email}"
}

# シークレットごとに明示的なアクセス権限を付与
# 各シークレットへの明示的な権限付与
resource "google_secret_manager_secret_iam_binding" "nextjs_app_secrets_access" {
  for_each  = { for secret in local.all_secrets : secret.id => secret.id }
  project   = var.gcp_project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  members   = ["serviceAccount:${google_service_account.nextjs_app_sa.email}"]
  
  depends_on = [
    google_service_account.nextjs_app_sa,
    google_secret_manager_secret.secrets
  ]
}

# サービスアカウントにFirebase Admin権限を付与
resource "google_project_iam_member" "nextjs_app_firebase_admin" {
  project = var.gcp_project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.nextjs_app_sa.email}"
}

# サービスアカウントにService Account Token Creator権限を付与（カスタムトークン作成に必要）
resource "google_project_iam_member" "nextjs_app_token_creator" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.nextjs_app_sa.email}"
}

# Cloud Run サービスの定義
resource "google_cloud_run_service" "nextjs_app" {
  name     = local.cloudrun_service_name
  location = var.region

  template {
    spec {
      # サービスアカウントを設定
      service_account_name = google_service_account.nextjs_app_sa.email
      
      containers {
        # 初期デプロイ用のダミーイメージ
        # 注意: 実際のデプロイはGitHub Actionsによって行われます
        image = local.cloudrun_initial_image
        
        # リソース制限を設定
        resources {
          limits = {
            cpu    = local.cloudrun_cpu_limit
            memory = local.cloudrun_memory_limit
          }
        }
        
        # 環境変数の設定
        # 基本環境変数
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "DEPLOY_ENV"
          value = "staging"  # 現在はステージング環境のみ
        }
        
        # Firebase関連の環境変数（サーバーサイド用）
        dynamic "env" {
          for_each = var.firebase_config
          content {
            name  = "FIREBASE_${env.key}"
            value = env.value
          }
        }
        
        # Firebase関連の環境変数（クライアントサイド用 NEXT_PUBLIC_プレフィックスを付ける）
        dynamic "env" {
          for_each = { for k in local.firebase_client_keys : k => k if contains(keys(var.firebase_config), k) }
          content {
            name  = "NEXT_PUBLIC_FIREBASE_${env.key}"
            value = lookup(var.firebase_config, env.key, "")
          }
        }
        
        # Discord認証関連のシークレット環境変数
        dynamic "env" {
          for_each = toset(local.discord_auth_secrets)
          content {
            name = env.value
            value_from {
              secret_key_ref {
                name = env.value
                key  = "latest"
              }
            }
          }
        }
        
        # ポート設定
        ports {
          container_port = local.cloudrun_container_port
        }
      }
    }
  }

  # トラフィック設定
  traffic {
    percent         = 100
    latest_revision = true
  }

  # GitHub Actionsがイメージを更新するため
  # コンテナイメージと環境変数の変更を無視する
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].spec[0].containers[0].env,
      metadata[0].annotations,
      template[0].metadata[0].annotations
      # client と labels は存在しない属性なので削除
    ]
  }

  # 依存関係の管理
  depends_on = [
    google_project_service.run,           # cloudrun -> run に修正
    google_project_service.artifactregistry
  ]
}

# 公開アクセス設定（すべてのユーザーに公開）
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.nextjs_app.name
  location = google_cloud_run_service.nextjs_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"  # 公開アクセスを許可
}

# Cloud Runサービスの出力値
output "nextjs_app_url" {
  value       = try(google_cloud_run_service.nextjs_app.status[0].url, "サービスがまだデプロイされていません")
  description = "Next.jsアプリケーションのURL"
}

# 注意: このファイルは最初にCloud BuildトリガーとIAM設定を適用した後、
# コンテナイメージをビルドしてから再度コメントを外して適用してください。