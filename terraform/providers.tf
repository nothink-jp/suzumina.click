terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.12"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 7.12"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.13.5"
}

provider "google" {
  project = var.gcp_project_id
  region  = var.region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.region
}

# トークンは環境変数 CLOUDFLARE_API_TOKEN から provider が直接読む（SPR-375）。terraform の変数にすると
# plan ファイルに値が入り、保存した plan を apply すると plan 時のトークンがそのまま使われる。env なら
# plan は読み取り専用トークン、apply は書き込みトークン（Environment(production) の secret）に分けられる。
provider "cloudflare" {}
