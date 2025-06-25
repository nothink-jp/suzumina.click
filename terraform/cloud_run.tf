/**
 * Cloud Run設定
 *
 * Next.js 15 App RouterアプリケーションをCloud Runにデプロイする設定
 */

# Cloud Runサービス（全環境で有効）
resource "google_cloud_run_v2_service" "nextjs_app" {
  
  provider = google

  name     = var.cloud_run_service_name
  location = var.region
  
  description = "suzumina.click Next.js 15 Web Application"
  
  labels = local.common_labels


  # Note: デフォルトURLアクセス制御はアプリケーションレベルで実装

  template {
    # スケーリング設定（環境別）
    scaling {
      min_instance_count = local.current_env.cloud_run_min_instances
      max_instance_count = local.current_env.cloud_run_max_instances
    }

    # コンテナ設定
    containers {
      # Artifact Registryのイメージを参照
      image = "${var.region}-docker.pkg.dev/${local.project_id}/${var.artifact_registry_repository_id}/web:latest"

      # リソース制限（環境別・コスト最適化）
      resources {
        limits = {
          cpu    = local.current_env.cloud_run_cpu
          memory = local.current_env.cloud_run_memory
        }
        cpu_idle = true      # アイドル時のCPU制限
        startup_cpu_boost = var.environment == "production" # 本番のみCPUブースト
      }

      # ポート設定
      ports {
        name           = "http1"
        container_port = 8080
      }

      # 環境変数
      env {
        name  = "NODE_ENV"
        value = var.environment == "development" ? "development" : "production"
      }
      

      # Firestore設定（プロジェクトIDを環境変数で設定）
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = local.project_id
      }

      # Next.js telemetry無効化
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }

      # NextAuth設定
      env {
        name  = "NEXTAUTH_URL"
        value = var.environment == "production" && var.custom_domain != "" ? "https://${var.custom_domain}" : "auto"
      }

      # NextAuth.js v5でカスタムドメイン使用時に必要
      env {
        name  = "AUTH_TRUST_HOST"
        value = var.environment == "production" ? "true" : "false"
      }

      # Discord OAuth Client ID (Secret Managerから取得)
      env {
        name = "DISCORD_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_secrets["DISCORD_CLIENT_ID"].secret_id
            version = "latest"
          }
        }
      }

      # Discord OAuth Client Secret (Secret Managerから取得)
      env {
        name = "DISCORD_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_secrets["DISCORD_CLIENT_SECRET"].secret_id
            version = "latest"
          }
        }
      }

      # Discord Bot Token (Secret Managerから取得)
      env {
        name = "DISCORD_BOT_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_secrets["DISCORD_BOT_TOKEN"].secret_id
            version = "latest"
          }
        }
      }

      # NextAuth Secret (Secret Managerから取得)
      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_secrets["NEXTAUTH_SECRET"].secret_id
            version = "latest"
          }
        }
      }

      # YouTube API Key (既存のSecret Managerから取得)
      env {
        name = "YOUTUBE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["YOUTUBE_API_KEY"].secret_id
            version = "latest"
          }
        }
      }

      # すずみなふぁみりー Guild ID
      env {
        name  = "SUZUMINA_GUILD_ID"
        value = var.suzumina_guild_id
      }

      # 許可されたホスト名（デフォルトURL制御用）
      env {
        name  = "ALLOWED_HOSTS"
        value = var.environment == "production" && var.custom_domain != "" ? var.custom_domain : ""
      }

      # ヘルスチェック設定
      startup_probe {
        http_get {
          path = "/api/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 2
        period_seconds        = 5
        failure_threshold     = 5
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
    }

    # サービスアカウント（Firestoreアクセス用）
    service_account = google_service_account.cloud_run_service_account.email

    # タイムアウト設定
    timeout = "300s"  # 5分

    # セッション親和性（なし - ステートレス）
    session_affinity = false
  }

  # トラフィック設定（全トラフィックを最新リビジョンに）
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_service_account.cloud_run_service_account,
    google_secret_manager_secret.auth_secrets
  ]
}

# Cloud Run用サービスアカウント（全環境で有効）
resource "google_service_account" "cloud_run_service_account" {
  
  provider = google

  account_id   = "cloud-run-nextjs"
  display_name = "Cloud Run Next.js Service Account"
  description  = "Next.js アプリケーションがFirestoreにアクセスするためのサービスアカウント"
}

# Firestore読み取り権限（全環境で有効）
resource "google_project_iam_member" "cloud_run_firestore_user" {
  provider = google

  project = local.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}


# Cloud Run Invoker権限（パブリックアクセス）（全環境で有効）
resource "google_cloud_run_v2_service_iam_binding" "public_access" {
  provider = google

  location = google_cloud_run_v2_service.nextjs_app.location
  name     = google_cloud_run_v2_service.nextjs_app.name
  role     = "roles/run.invoker"

  members = [
    "allUsers"
  ]

  depends_on = [google_cloud_run_v2_service.nextjs_app]
}


# カスタムドメイン用のドメインマッピング（オプション）
resource "google_cloud_run_domain_mapping" "custom_domain" {
  provider = google
  count    = local.current_env.enable_custom_domain && var.custom_domain != "" ? 1 : 0

  location = var.region
  name     = var.custom_domain

  metadata {
    namespace = local.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.nextjs_app.name
  }
}

# Cloud Run URL出力
output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.nextjs_app.uri
}

output "cloud_run_service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run_service_account.email
}

# デバッグ用出力
output "nextauth_url_debug" {
  description = "NextAuth URL configuration for debugging"
  value = {
    environment   = var.environment
    custom_domain = var.custom_domain
    nextauth_url  = var.environment == "production" && var.custom_domain != "" ? "https://${var.custom_domain}" : "auto"
  }
  sensitive = false
}