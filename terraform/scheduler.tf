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
    # 関数が使用するサービスアカウントに依存
    google_service_account.fetch_youtube_videos_sa,
  ]
}


# ===================================================================
# DLsite時系列データ収集スケジューラー
# ===================================================================

# 時系列データ収集（毎時実行）
# 30分に実行して価格・販売数・評価等のリアルタイムデータを取得
resource "google_cloud_scheduler_job" "collect_dlsite_timeseries_hourly" {
  project   = var.gcp_project_id
  region    = var.region
  name      = "collect-dlsite-timeseries-hourly"
  schedule  = "30 * * * *" # 毎時30分に実行
  time_zone = "Asia/Tokyo"
  description = "DLsite時系列データ（価格・販売数・評価）を毎時収集"

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_timeseries_collect_trigger.id
    data       = base64encode(jsonencode({
      type = "collection"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_timeseries_collect_trigger,
    google_pubsub_topic_iam_member.scheduler_timeseries_pubsub_publisher,
  ]
}

# 日次集計処理（毎日午前3時実行）
# 前日分の生データを集計して永続保存用データを生成
resource "google_cloud_scheduler_job" "dlsite_timeseries_daily_aggregation" {
  project   = var.gcp_project_id
  region    = var.region
  name      = "dlsite-timeseries-daily-aggregation"
  schedule  = "0 3 * * *" # 毎日午前3時に実行
  time_zone = "Asia/Tokyo"
  description = "DLsite時系列データの日次集計処理（午前3時実行）"

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_timeseries_collect_trigger.id
    data       = base64encode(jsonencode({
      type = "aggregation"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_timeseries_collect_trigger,
    google_pubsub_topic_iam_member.scheduler_timeseries_pubsub_publisher,
  ]
}

# 期限切れデータクリーンアップ（毎日午前4時実行）
# 7日前より古い生データを削除してストレージコストを最適化
resource "google_cloud_scheduler_job" "dlsite_timeseries_cleanup" {
  project   = var.gcp_project_id
  region    = var.region
  name      = "dlsite-timeseries-cleanup"
  schedule  = "0 4 * * *" # 毎日午前4時に実行
  time_zone = "Asia/Tokyo"
  description = "DLsite時系列データの期限切れクリーンアップ（7日保持）"

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_timeseries_collect_trigger.id
    data       = base64encode(jsonencode({
      type = "cleanup"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_timeseries_collect_trigger,
    google_pubsub_topic_iam_member.scheduler_timeseries_pubsub_publisher,
  ]
}