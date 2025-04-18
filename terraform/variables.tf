variable "gcp_project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "youtube_api_key" {
  description = "The YouTube Data API v3 key."
  type        = string
  sensitive   = true # Mark as sensitive to prevent exposure in logs/outputs
}