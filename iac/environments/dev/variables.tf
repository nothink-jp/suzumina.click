variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "region" {
  description = "The GCP region for resources."
  type        = string
  default     = "asia-northeast1"
}

variable "artifact_registry_repository_id" {
  description = "The ID for the Artifact Registry repository."
  type        = string
  default     = "suzumina-click-docker-repo" # デフォルト値を設定 (設計書に合わせる)
}

variable "cloud_run_service_name" {
  description = "The name for the Cloud Run service."
  type        = string
  default     = "web"
}

variable "deployer_service_account_id" {
  description = "The ID for the CI/CD deployer service account."
  type        = string
  default     = "github-actions-deployer"
}

variable "runtime_service_account_id" {
  description = "The ID for the Cloud Run runtime service account."
  type        = string
  default     = "app-runtime"
}

variable "nextauth_url" {
  description = "The base URL for the NextAuth application (e.g., https://your-app-url)."
  type        = string
  # No default, should be provided via tfvars or environment variables
}

variable "discord_guild_id" {
  description = "The Discord Guild ID required for authentication."
  type        = string
  # No default, should be provided via tfvars or environment variables
}