# Cloud Scheduler API は api_services.tf で有効化済み

# 1時間に1回 YouTube 動画取得 Pub/Sub トピックをトリガーするジョブ
# 毎時19分に実行される定期的なスケジュールタスク
resource "google_cloud_scheduler_job" "fetch_youtube_videos_hourly" {
  project  = var.gcp_project_id
  region   = var.region # 他のリソースと同じリージョンを使用
  name     = "fetch-youtube-videos-hourly"
  schedule = "19 * * * *" # 毎時19分に実行（cronフォーマット）
  time_zone = "Asia/Tokyo" # タイムゾーンを東京に設定
  description = "YouTube動画を毎時間取得するためのPub/Subトピックをトリガーします"

  # Pub/Sub ターゲット設定
  pubsub_target {
    topic_name = google_pubsub_topic.youtube_video_fetch_trigger.id
    # 空のJSONオブジェクトをbase64エンコードしたデータを送信
    data       = base64encode("{}")
  }

  depends_on = [
    google_project_service.cloudscheduler, # Cloud Scheduler APIが有効になってから作成
    google_pubsub_topic.youtube_video_fetch_trigger, # トリガー対象のPub/Subトピックが存在する必要がある
    # スケジューラのサービスエージェントがPub/Subへの発行権限を持っていることを確認（iam.tfで定義）
    google_pubsub_topic_iam_member.scheduler_pubsub_publisher,
    google_pubsub_topic_iam_member.scheduler_dlsite_pubsub_publisher,
    # 関数が使用するサービスアカウントに依存
    google_service_account.fetch_youtube_videos_sa,
  ]
}

# 1時間に3回 DLsite 作品取得 Pub/Sub トピックをトリガーするジョブ
# 毎時6,26,46分に実行される定期的なスケジュールタスク
resource "google_cloud_scheduler_job" "fetch_dlsite_works_every_20min" {
  project  = var.gcp_project_id
  region   = "asia-northeast1" # 他のリソースと同じリージョンを使用（東京リージョン）
  name     = "fetch-dlsite-works-every-20min"
  schedule = "6,26,46 * * * *" # 毎時6,26,46分に実行（cronフォーマット）
  time_zone = "Asia/Tokyo" # タイムゾーンを東京に設定
  description = "DLsite作品を1時間に3回（6,26,46分）取得するためのPub/Subトピックをトリガーします"

  # Pub/Sub ターゲット設定
  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_works_fetch_trigger.id
    # 空のJSONオブジェクトをbase64エンコードしたデータを送信
    data       = base64encode("{}")
  }

  depends_on = [
    google_project_service.cloudscheduler, # Cloud Scheduler APIが有効になってから作成
    google_pubsub_topic.dlsite_works_fetch_trigger, # トリガー対象のPub/Subトピックが存在する必要がある
    # スケジューラのサービスエージェントがPub/Subへの発行権限を持っていることを確認（iam.tfで定義）
    google_pubsub_topic_iam_member.scheduler_dlsite_pubsub_publisher,
    # 関数が使用するサービスアカウントに依存
    google_service_account.fetch_dlsite_works_sa,
  ]
}