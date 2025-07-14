# 管理者専用アプリケーション設定

# Cloud Run サービス（管理者アプリ）
resource "google_cloud_run_v2_service" "admin_app" {
  name     = "suzumina-admin"
  location = var.region

  template {
    scaling {
      # 通常は0インスタンス、必要時のみスケールアップ
      min_instance_count = 0
      max_instance_count = 1
    }

    timeout = "300s"
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.gcp_project_id}/${var.artifact_registry_repository_id}/suzumina-admin:latest"
      
      ports {
        container_port = 8080
      }
      
      # リソース設定（最小構成）
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = false
      }

      # 環境変数
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name  = "GCP_PROJECT_ID"
        value = var.gcp_project_id
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["NEXTAUTH_SECRET"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DISCORD_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["DISCORD_CLIENT_ID"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DISCORD_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["DISCORD_CLIENT_SECRET"].secret_id
            version = "latest"
          }
        }
      }


      env {
        name  = "NEXTAUTH_URL"
        value = "https://admin.suzumina.click"
      }
    }

    service_account = google_service_account.admin_app_service_account.email
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# 管理者アプリ用サービスアカウント
resource "google_service_account" "admin_app_service_account" {
  account_id   = "suzumina-admin-sa"
  display_name = "suzumina.click Admin App Service Account"
  description  = "Service account for suzumina.click admin application"
}

# Firestore アクセス権限
resource "google_project_iam_member" "admin_app_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.admin_app_service_account.email}"
}

# Secret Manager アクセス権限
resource "google_project_iam_member" "admin_app_secrets" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.admin_app_service_account.email}"
}

# ログ書き込み権限
resource "google_project_iam_member" "admin_app_logging" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.admin_app_service_account.email}"
}

# Pub/Sub パブリッシャー権限（Cloud Functions手動トリガー用）
resource "google_project_iam_member" "admin_app_pubsub_publisher" {
  project = var.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.admin_app_service_account.email}"
}

# 管理者アプリは既存のSecret Managerシークレットを使用

# パブリックアクセス許可（アプリケーション内でDiscord認証による制御）
resource "google_cloud_run_v2_service_iam_member" "admin_app_public_access" {
  location = google_cloud_run_v2_service.admin_app.location
  name     = google_cloud_run_v2_service.admin_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# カスタムドメインマッピング（admin.suzumina.click）
resource "google_cloud_run_domain_mapping" "admin_custom_domain" {
  location = var.region
  name     = "admin.${var.domain_name}"
  
  metadata {
    namespace = var.gcp_project_id
  }
  
  spec {
    route_name = google_cloud_run_v2_service.admin_app.name
  }
  
  depends_on = [google_cloud_run_v2_service.admin_app]
}

# アウトプット
output "admin_app_url" {
  description = "Admin application URL"
  value       = google_cloud_run_v2_service.admin_app.uri
}

output "admin_app_service_account_email" {
  description = "Admin app service account email"
  value       = google_service_account.admin_app_service_account.email
}