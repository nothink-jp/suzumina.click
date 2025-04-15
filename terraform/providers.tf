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
  required_version = ">= 1.3"
}

provider "google" {
  project = var.gcp_project_id
  region  = "asia-northeast1"
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = "asia-northeast1"
}