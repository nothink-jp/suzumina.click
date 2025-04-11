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

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}


# -----------------------------------------------------------------------------
# API有効化
# -----------------------------------------------------------------------------
resource "google_project_service" "run_api" {
  project                    = var.project_id
  service                    = "run.googleapis.com"
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "artifactregistry_api" {
  project                    = var.project_id
  service                    = "artifactregistry.googleapis.com"
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "iamcredentials_api" {
  project                    = var.project_id
  service                    = "iamcredentials.googleapis.com" # Workload Identity に必要
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "secretmanager_api" {
  project                    = var.project_id
  service                    = "secretmanager.googleapis.com" # Secret Manager に必要
  disable_dependent_services = false
  disable_on_destroy         = false
}

# Cloud SQL APIを有効化
resource "google_project_service" "sql_api" {
  project                    = var.project_id
  service                    = "sqladmin.googleapis.com" # Cloud SQL に必要
  disable_dependent_services = false
  disable_on_destroy         = false
}

# -----------------------------------------------------------------------------
# IAM: サービスアカウント (既存リソースを参照)
# -----------------------------------------------------------------------------
data "google_service_account" "deployer" {
  account_id = var.deployer_service_account_id
  project    = var.project_id
}

data "google_service_account" "runtime" {
  account_id = var.runtime_service_account_id
  project    = var.project_id
}

# -----------------------------------------------------------------------------
# Secret Manager: シークレット参照 (シークレット自体は外部で作成済みと仮定)
# -----------------------------------------------------------------------------
# シークレット名は {secret-name}-dev と仮定
data "google_secret_manager_secret" "nextauth_secret" {
  project   = var.project_id
  secret_id = "nextauth-secret-dev" # 仮定: 実際のシークレット名に合わせてください
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_client_id" {
  project   = var.project_id
  secret_id = "discord-client-id-dev" # 仮定: 実際のシークレット名に合わせてください
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_client_secret" {
  project   = var.project_id
  secret_id = "discord-client-secret-dev" # 仮定: 実際のシークレット名に合わせてください
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "nextauth_url" {
  project   = var.project_id
  secret_id = "nextauth-url-dev" # 仮定: 実際のシークレット名に合わせてください
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "discord_guild_id" {
  project   = var.project_id
  secret_id = "discord-guild-id-dev" # 仮定: 実際のシークレット名に合わせてください
  
  depends_on = [google_project_service.secretmanager_api]
}

data "google_secret_manager_secret" "auth_trust_host" {
  project   = var.project_id
  secret_id = "auth-trust-host-dev" # 作成したシークレット名
  depends_on = [google_project_service.secretmanager_api]
}

# -----------------------------------------------------------------------------
# Cloud SQL: PostgreSQLインスタンスの設定
# -----------------------------------------------------------------------------
# VPCネットワークの作成
resource "google_compute_network" "vpc_network" {
  name                    = "suzumina-vpc-network"
  auto_create_subnetworks = true
  project                 = var.project_id
}

# Cloud SQLインスタンスの作成
resource "google_sql_database_instance" "instance" {
  name             = "suzumina-db-instance-dev"
  region           = var.region
  database_version = "POSTGRES_14"
  
  settings {
    tier = "db-f1-micro"  # 開発/テスト用の小さいインスタンス
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"  # JST 11:00
      point_in_time_recovery_enabled = true
    }
    
    ip_configuration {
      ipv4_enabled        = false
      private_network     = google_compute_network.vpc_network.id
      require_ssl         = true
    }
  }
  
  deletion_protection = true  # 誤削除防止
  
  depends_on = [
    google_project_service.sql_api
  ]
}

# データベースの作成
resource "google_sql_database" "database" {
  name     = "suzumina_db"
  instance = google_sql_database_instance.instance.name
}

# データベースユーザーの作成
resource "google_sql_user" "user" {
  name     = "suzumina_app"
  instance = google_sql_database_instance.instance.name
  password = var.db_password  # 変数から取得
}

# データベース接続URLをSecret Managerに保存
resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "database-url-dev"
  
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  
  depends_on = [
    google_project_service.secretmanager_api
  ]
}

# データベース接続URLの値を設定
resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgres://${google_sql_user.user.name}:${var.db_password}@${google_sql_database_instance.instance.private_ip_address}:5432/${google_sql_database.database.name}"
}

# -----------------------------------------------------------------------------
# Cloud Run: サービス定義 (環境変数とシークレット参照を設定)
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_service_name

  # CI/CD でイメージが更新されるため、イメージの変更は Terraform で無視する
  lifecycle {
    ignore_changes = [
      # エラーメッセージに従い、インデックスを使用
      template[0].containers[0].image,
    ]
  }

  template {
    service_account = data.google_service_account.runtime.email # 実行SAを指定

    containers {
      # 初期デプロイ用のイメージパス (CI/CD で上書きされる)
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.cloud_run_service_name}:latest"

      ports {
        container_port = 3000 # Next.jsのデフォルトポート
      }

      env {
        name  = "NODE_ENV"
        value = "production" # 本番環境として設定
      }
      # DISCORD_GUILD_ID を Secret Manager から取得するように変更
      env {
        name = "DISCORD_GUILD_ID"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.discord_guild_id.secret_id
            version = "latest" # 最新バージョンを参照
          }
        }
      }
      # NEXTAUTH_URL を Secret Manager から取得するように変更
      env {
        name = "NEXTAUTH_URL"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.nextauth_url.secret_id
            version = "latest" # 最新バージョンを参照
          }
        }
      }
      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.nextauth_secret.secret_id
            version = "latest" # 最新バージョンを参照
          }
        }
      }
      env {
        name = "DISCORD_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.discord_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DISCORD_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.discord_client_secret.secret_id
            version = "latest"
          }
        }
      }
      # AUTH_TRUST_HOST を Secret Manager から取得するように追加
      env {
        name = "AUTH_TRUST_HOST"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.auth_trust_host.secret_id
            version = "latest"
          }
        }
      }
      # DATABASE_URL を Secret Manager から取得するように追加
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # 公開アクセスを許可 (必要に応じて変更)
  # Terraform管理下に置くため、ここで明示的に設定
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
    data.google_secret_manager_secret.auth_trust_host, # 新しいシークレットへの依存を追加
    google_secret_manager_secret.database_url, # データベースURLシークレットへの依存を追加
  ]
}

# -----------------------------------------------------------------------------
# IAM: Cloud Run 実行SAにSecret Accessorロールを付与
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

# 新しいシークレットへのアクセス権限を追加
resource "google_secret_manager_secret_iam_member" "runtime_access_auth_trust_host" {
  project   = data.google_secret_manager_secret.auth_trust_host.project
  secret_id = data.google_secret_manager_secret.auth_trust_host.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

# データベースURLシークレットへのアクセス権限を追加
resource "google_secret_manager_secret_iam_member" "runtime_access_database_url" {
  project   = google_secret_manager_secret.database_url.project
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}

# Cloud SQLクライアントロールを付与
resource "google_project_iam_member" "runtime_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_service_account.runtime.email}"
}


# -----------------------------------------------------------------------------
# Workload Identity Federation for GitHub Actions
# -----------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"

  depends_on = [
    google_project_service.iamcredentials_api
  ]
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                                = var.project_id
  workload_identity_pool_id              = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                         = "GitHub Actions Provider"
  description                          = "Workload Identity Provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_condition = "assertion.repository == 'nothink-jp/suzumina.click'"

  depends_on = [
    google_iam_workload_identity_pool.github_pool
  ]
}

# DeployerサービスアカウントにWorkload Identity Userロールを付与
resource "google_service_account_iam_member" "deployer_workload_identity_user" {
  service_account_id = data.google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/*"

  depends_on = [
    google_iam_workload_identity_pool_provider.github_provider
  ]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "workload_identity_provider_name" {
  description = "The full name of the Workload Identity Provider for GitHub Actions. Use this value for the GCP_WORKLOAD_IDENTITY_PROVIDER secret in GitHub."
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