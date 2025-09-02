# Cloud Scheduler API は api_services.tf で有効化済み

# 1時間に1回 YouTube 動画取得 Pub/Sub トピックをトリガーするジョブ
# 毎時19分に実行される定期的なスケジュールタスク
resource "google_cloud_scheduler_job" "fetch_youtube_videos_hourly" {
  project     = var.gcp_project_id
  region      = var.region # 他のリソースと同じリージョンを使用
  name        = "fetch-youtube-videos-hourly"
  schedule    = "30 * * * *" # 毎時30分に実行（DLsite処理との重複回避）
  time_zone   = "Asia/Tokyo" # タイムゾーンを東京に設定
  description = "YouTube動画を毎時間取得するためのPub/Subトピックをトリガーします"

  # Pub/Sub ターゲット設定
  pubsub_target {
    topic_name = google_pubsub_topic.youtube_video_fetch_trigger.id
    # 空のJSONオブジェクトをbase64エンコードしたデータを送信
    data = base64encode("{}")
  }

  depends_on = [
    google_project_service.cloudscheduler,           # Cloud Scheduler APIが有効になってから作成
    google_pubsub_topic.youtube_video_fetch_trigger, # トリガー対象のPub/Subトピックが存在する必要がある
    # スケジューラのサービスエージェントがPub/Subへの発行権限を持っていることを確認（iam.tfで定義）
    google_pubsub_topic_iam_member.scheduler_pubsub_publisher,
    # 関数が使用するサービスアカウントに依存
    google_service_account.fetch_youtube_videos_sa,
  ]
}


# 旧 collectDLsiteTimeseries 関連スケジューラーは統合アーキテクチャにより削除済み

# ==============================================================================
# Cloud Runウォームアップスケジューラー
# ==============================================================================
# 目的: コールドスタートを防ぐために定期的にヘルスチェックエンドポイントを呼び出す
# 実行時間: 日中（8-20時）の5分ごと
# コスト: 約50円/月
# ==============================================================================
resource "google_cloud_scheduler_job" "cloud_run_warmup" {
  project     = var.gcp_project_id
  region      = var.region
  name        = "cloud-run-warmup"
  description = "Cloud Runのコールドスタートを防ぐためのウォームアップジョブ"

  # 日本時間8-20時の間、5分ごとに実行
  # この時間帯が主要なアクセス時間と想定
  schedule  = "*/5 8-20 * * *"
  time_zone = "Asia/Tokyo"

  # HTTPターゲット設定
  http_target {
    uri         = "${google_cloud_run_v2_service.nextjs_app.uri}/api/health"
    http_method = "GET"

    # タイムアウト設定
    headers = {
      "User-Agent" = "Google-Cloud-Scheduler"
    }

    # Cloud Runサービスへのアクセス認証
    oidc_token {
      service_account_email = google_service_account.cloud_run_service_account.email
      audience              = google_cloud_run_v2_service.nextjs_app.uri
    }
  }

  # リトライポリシー（ヘルスチェックなので最小限）
  retry_config {
    retry_count          = 1
    min_backoff_duration = "5s"
    max_backoff_duration = "10s"
  }

  # 実行タイムアウト
  attempt_deadline = "30s"

  depends_on = [
    google_cloud_run_v2_service.nextjs_app,
    google_service_account.cloud_run_service_account,
    google_project_service.cloudscheduler
  ]
}