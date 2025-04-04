# GCPリソース定義ファイル
# このファイルにAPI有効化、IAM、Artifact Registry、Cloud Runなどのリソースを追加していきます。

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0" # バージョン制約 (bootstrap.tf と合わせる)
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
  disable_on_destroy         = false # Terraform管理外のリソースが依存している可能性があるためfalse推奨
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
# Cloud Run (既存サービスを参照)
# -----------------------------------------------------------------------------
data "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_service_name

  depends_on = [
    google_project_service.run_api,
    data.google_service_account.runtime,
  ]
}

# -----------------------------------------------------------------------------
# Workload Identity Federation for GitHub Actions
# -----------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool" # プールID (任意)
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"

  depends_on = [
    google_project_service.iamcredentials_api
  ]
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                                = var.project_id
  workload_identity_pool_id              = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider" # プロバイダーID (任意)
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

  # 特定のリポジトリに制限
  attribute_condition = "assertion.repository == 'nothink-jp/suzumina.click'" # 修正: assertion. を使用

  depends_on = [
    google_iam_workload_identity_pool.github_pool
  ]
}

# DeployerサービスアカウントにWorkload Identity Userロールを付与
resource "google_service_account_iam_member" "deployer_workload_identity_user" {
  service_account_id = data.google_service_account.deployer.name # 修正: data を使用 (name 属性)
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/*" # 修正: プール内の全IDを許可 (制限は provider で行う)

  depends_on = [ # 追加: プロバイダー作成後に実行
    google_iam_workload_identity_pool_provider.github_provider
  ]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "workload_identity_provider_name" {
  description = "The full name of the Workload Identity Provider for GitHub Actions. Use this value for the GCP_WORKLOAD_IDENTITY_PROVIDER secret in GitHub."
  value       = google_iam_workload_identity_pool_provider.github_provider.name # `name` 属性を使用 (projects/../providers/...)
}