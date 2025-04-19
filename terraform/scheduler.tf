# Cloud Scheduler API を有効化
resource "google_project_service" "cloudscheduler" {
  project = var.gcp_project_id
  service = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

# 1時間に1回 YouTube 動画取得 Pub/Sub トピックをトリガーするジョブ
resource "google_cloud_scheduler_job" "fetch_youtube_videos_hourly" {
  project  = var.gcp_project_id
  region   = "asia-northeast1" # Match the region of other resources
  name     = "fetch-youtube-videos-hourly"
  schedule = "19 * * * *" # Every hour at minute 19
  time_zone = "Asia/Tokyo"
  description = "Triggers the Pub/Sub topic to fetch YouTube videos every hour." # Description updated

  # Pub/Sub ターゲット設定に戻す
  pubsub_target {
    topic_name = google_pubsub_topic.youtube_video_fetch_trigger.id
    # Provide a valid, non-empty base64 encoded string (e.g., empty JSON object)
    data       = base64encode("{}")
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.youtube_video_fetch_trigger, # Re-added dependency
    # Ensure the scheduler service agent has permission to publish (defined in iam.tf)
    google_pubsub_topic_iam_member.scheduler_pubsub_publisher, # Re-added dependency
    # Ensure the function exists before the job tries to depend on its SA (implicitly via IAM)
    # google_cloudfunctions2_function.fetch_youtube_videos # Dependency on function itself
    google_service_account.fetch_youtube_videos_sa, # Dependency on the SA used by the function trigger
  ]
}