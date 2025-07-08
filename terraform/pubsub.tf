# Pub/Sub API は api_services.tf で有効化済み

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


# 旧 dlsite-timeseries-collect-trigger トピックは統合アーキテクチャにより削除済み