# Pub/Sub API を有効化 (依存関係のため firebase.tf にも定義があるが、念のためここにも記述)
# Terraform は重複定義を検知し、1つだけ作成する
resource "google_project_service" "pubsub" {
  project = var.gcp_project_id
  service = "pubsub.googleapis.com"
  disable_on_destroy = false # Terraform実行時にリソースを削除してもAPIは無効化しない
}

# YouTube動画取得をトリガーするための Pub/Sub トピック
# Cloud Schedulerからのメッセージを受け取り、Cloud Functionsを起動する
resource "google_pubsub_topic" "youtube_video_fetch_trigger" {
  project = var.gcp_project_id
  name    = "youtube-video-fetch-trigger" # トピック名

  # Pub/Sub APIが有効になってから作成する
  depends_on = [
    google_project_service.pubsub
  ]
}

# DLsite作品取得をトリガーするための Pub/Sub トピック
# Cloud Schedulerからのメッセージを受け取り、Cloud Functionsを起動する
resource "google_pubsub_topic" "dlsite_works_fetch_trigger" {
  project = var.gcp_project_id
  name    = "dlsite-works-fetch-trigger" # トピック名

  # Pub/Sub APIが有効になってから作成する
  depends_on = [
    google_project_service.pubsub
  ]
}