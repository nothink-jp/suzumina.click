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
# Artifact Registry (既存リソースを参照)
# -----------------------------------------------------------------------------
data "google_artifact_registry_repository" "docker_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id

  depends_on = [
    google_project_service.artifactregistry_api # APIが有効になってから参照
  ]
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

# -----------------------------------------------------------------------------
# Cloud Run: サービス定義 (環境変数とシークレット参照を設定)
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_service_name

  # CI/CDパイプラインがイメージを更新するため、templateはライフサイクルで無視
  # ただし、初回デプロイや設定変更時には必要
  lifecycle {
    ignore_changes = [
      template.containers[0].image,
    ]
  }

  template {
    service_account = data.google_service_account.runtime.email # 実行SAを指定

    containers {
      # イメージはCI/CDで更新されるため、ここではダミーまたは最新のものを指定
      # apply時に最新イメージが不明な場合は、既存サービスのイメージを data で取得して使うなどの工夫が必要
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.cloud_run_service_name}:latest" # 仮のイメージパス

      ports {
        container_port = 3000 # Next.jsのデフォルトポート
      }

      env {
        name  = "NODE_ENV"
        value = "production" # 本番環境として設定
      }
      env {
        name  = "NEXTAUTH_URL"
        value = var.nextauth_url # variables.tf から取得
      }
      env {
        name  = "DISCORD_GUILD_ID"
        value = var.discord_guild_id # variables.tf から取得
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