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

# -----------------------------------------------------------------------------
# IAM: サービスアカウント
# -----------------------------------------------------------------------------
resource "google_service_account" "deployer" {
  account_id   = var.deployer_service_account_id
  display_name = "GitHub Actions Deployer Service Account"
  description  = "Service account for GitHub Actions to deploy resources"
  project      = var.project_id
}

resource "google_service_account" "runtime" {
  account_id   = var.runtime_service_account_id
  display_name = "Cloud Run Runtime Service Account"
  description  = "Service account for the Cloud Run service to run as"
  project      = var.project_id
}

# -----------------------------------------------------------------------------
# IAM: ロール付与 (CI/CD Deployer用)
# -----------------------------------------------------------------------------
resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = google_service_account.deployer.member
}

resource "google_project_iam_member" "deployer_artifactregistry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = google_service_account.deployer.member
}

resource "google_project_iam_member" "deployer_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser" # Cloud RunサービスにSAを割り当てるために必要
  member  = google_service_account.deployer.member
}

# -----------------------------------------------------------------------------
# Artifact Registry
# -----------------------------------------------------------------------------
resource "google_artifact_registry_repository" "docker_repo" {
  provider      = google-beta # Dockerリポジトリ作成にはbetaプロバイダが必要な場合がある
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "Docker repository for suzumina.click application images"
  format        = "DOCKER"

  depends_on = [
    google_project_service.artifactregistry_api # APIが有効になってから作成
  ]
}

# -----------------------------------------------------------------------------
# Cloud Run
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_service_name

  template {
    service_account = google_service_account.runtime.email
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello" # 初期イメージ (CI/CDで更新)
      ports {
        container_port = 8080 # Next.jsアプリがリッスンするポート (Dockerfileに合わせる)
      }
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
    }
  }

  # Allow unauthenticated access for now
  # 本番環境では認証を設定すること
  # iam_policy {
  #   policy_data = data.google_iam_policy.noauth.policy_data
  # }
  # data "google_iam_policy" "noauth" {
  #   binding {
  #     role = "roles/run.invoker"
  #     members = [
  #       "allUsers",
  #     ]
  #   }
  # }

  depends_on = [
    google_project_service.run_api,
    google_service_account.runtime,
  ]

  # lifecycle {
  #   ignore_changes = [template[0].containers[0].image] # CI/CDでイメージが更新されるため、Terraformでの変更を無視
  # }
}

# Allow unauthenticated access using google_cloud_run_v2_service_iam_binding
resource "google_cloud_run_v2_service_iam_binding" "allow_unauthenticated" {
  project  = google_cloud_run_v2_service.web.project
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}