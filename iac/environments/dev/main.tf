# GCPリソース定義ファイル

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# 中略：API有効化、サービスアカウント、VPC、Cloud SQLの設定は同じ

# -----------------------------------------------------------------------------
# Secret Manager: シークレット参照 (シークレット自体は外部で作成済みと仮定)
# -----------------------------------------------------------------------------
# シークレット名は {secret-name}-dev と仮定
data "google_secret_manager_secret" "nextauth_secret" {
  project   = var.project_id
  secret_id = "nextauth-secret-dev"
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_client_id" {
  project   = var.project_id
  secret_id = "discord-client-id-dev"
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_client_secret" {
  project   = var.project_id
  secret_id = "discord-client-secret-dev"
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "nextauth_url" {
  project   = var.project_id
  secret_id = "nextauth-url-dev"
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_guild_id" {
  project   = var.project_id
  secret_id = "discord-guild-id-dev"
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "auth_trust_host" {
  project   = var.project_id
  secret_id = "auth-trust-host-dev"
  depends_on = [google_project_service.secretmanager_api]
}

# データベース接続URLのシークレットを参照
data "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "database-url-dev"
  depends_on = [google_project_service.secretmanager_api]
}

# -----------------------------------------------------------------------------
# Cloud Run: サービス定義 (環境変数とシークレット参照を設定)
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_service_name

  template {
    service_account = data.google_service_account.runtime.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.cloud_run_service_name}:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # 各環境変数のシークレット参照を設定
      # プロジェクトIDを明示的に指定
      env {
        name = "DISCORD_GUILD_ID"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/discord-guild-id-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "NEXTAUTH_URL"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/nextauth-url-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/nextauth-secret-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "DISCORD_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/discord-client-id-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "DISCORD_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/discord-client-secret-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "AUTH_TRUST_HOST"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/auth-trust-host-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = "projects/${var.project_id}/secrets/database-url-dev"
            version = "latest"
          }
        }
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  depends_on = [
    google_project_service.run_api,
    data.google_service_account.runtime,
    # シークレット参照の前にAPI有効化とシークレットデータ取得を待つ
    google_project_service.secretmanager_api,
    data.google_secret_manager_secret.nextauth_secret,
    data.google_secret_manager_secret.discord_client_id,
    data.google_secret_manager_secret.discord_client_secret,
    data.google_secret_manager_secret.nextauth_url,
    data.google_secret_manager_secret.discord_guild_id,
    data.google_secret_manager_secret.auth_trust_host,
    data.google_secret_manager_secret.database_url
  ]
}

# -----------------------------------------------------------------------------
# IAM: Secret Manager アクセス権限の設定
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret_iam_member" "runtime_access_nextauth_secret" {
  project   = data.google_secret_manager_secret.nextauth_secret.project
  secret_id = data.google_secret_manager_secret.nextauth_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_discord_client_id" {
  project   = data.google_secret_manager_secret.discord_client_id.project
  secret_id = data.google_secret_manager_secret.discord_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_discord_client_secret" {
  project   = data.google_secret_manager_secret.discord_client_secret.project
  secret_id = data.google_secret_manager_secret.discord_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_nextauth_url" {
  project   = data.google_secret_manager_secret.nextauth_url.project
  secret_id = data.google_secret_manager_secret.nextauth_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_discord_guild_id" {
  project   = data.google_secret_manager_secret.discord_guild_id.project
  secret_id = data.google_secret_manager_secret.discord_guild_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_auth_trust_host" {
  project   = data.google_secret_manager_secret.auth_trust_host.project
  secret_id = data.google_secret_manager_secret.auth_trust_host.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_access_database_url" {
  project   = data.google_secret_manager_secret.database_url.project
  secret_id = data.google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

# Cloud SQLクライアントロールを付与
resource "google_project_iam_member" "runtime_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_service_account.runtime.email}"
}

# 中略：Workload Identity Federation の設定は同じ

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "workload_identity_provider_name" {
  description = "The full name of the Workload Identity Provider for GitHub Actions."
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "cloud_run_service_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.web.uri
}

output "cloud_sql_instance_name" {
  description = "The name of the Cloud SQL instance."
  value       = google_sql_database_instance.instance.name
}

output "cloud_sql_database_name" {
  description = "The name of the database in the Cloud SQL instance."
  value       = google_sql_database.database.name
}

output "database_connection_command" {
  description = "Command to update database connection URL."
  value       = "Run: ./db_url_update.sh ${var.project_id} ${google_sql_user.user.name} <password> ${google_sql_database_instance.instance.name} ${google_sql_database.database.name}"
}