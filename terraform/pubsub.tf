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


# DLsite時系列データ収集をトリガーするための Pub/Sub トピック (非推奨・削除済み)
# ⚠️ 統合アーキテクチャにより廃止: fetchDLsiteWorksIndividualAPI が時系列データ収集も統合実行
# resource "google_pubsub_topic" "dlsite_timeseries_collect_trigger" {
#   project = var.gcp_project_id
#   name    = "dlsite-timeseries-collect-trigger"
#   depends_on = [google_project_service.pubsub]
# }