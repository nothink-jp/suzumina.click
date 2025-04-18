# Pub/Sub API を有効化 (依存関係のため firebase.tf にも定義があるが、念のためここにも記述)
# Terraform は重複定義を検知し、1つだけ作成する
resource "google_project_service" "pubsub" {
  project = var.gcp_project_id
  service = "pubsub.googleapis.com"
  disable_on_destroy = false
}

# Cloud Functions をトリガーするための Pub/Sub トピック
resource "google_pubsub_topic" "youtube_video_fetch_trigger" {
  project = var.gcp_project_id
  name    = "youtube-video-fetch-trigger" # Planned topic name

  depends_on = [
    google_project_service.pubsub
  ]
}