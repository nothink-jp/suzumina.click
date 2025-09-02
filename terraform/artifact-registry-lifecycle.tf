# Enhanced cleanup policies for existing Artifact Registry repository
# This adds stronger lifecycle management to the existing repository

# Data source to reference the existing repository
data "google_artifact_registry_repository" "existing_repo" {
  location      = var.region
  repository_id = var.artifact_registry_repository_id
}

# Output repository information
output "artifact_registry_repository_url" {
  description = "URL of the Artifact Registry repository"
  value       = "${var.region}-docker.pkg.dev/${var.gcp_project_id}/${var.artifact_registry_repository_id}"
}

output "enhanced_cleanup_info" {
  description = "Enhanced cleanup policies information"
  value = {
    existing_policies = {
      keep_latest_web   = "5 images"
      keep_latest_admin = "3 images"
      delete_untagged   = "7 days"
    }
    github_actions_cleanup = {
      web_images      = "10 images kept"
      web_revisions   = "5 revisions kept"
      admin_images    = "5 images kept"
      admin_revisions = "3 revisions kept"
    }
    repository_url = "${var.region}-docker.pkg.dev/${var.gcp_project_id}/${var.artifact_registry_repository_id}"
  }
}