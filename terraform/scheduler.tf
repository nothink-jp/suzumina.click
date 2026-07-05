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

# SPR-230: discovery方式（uploads playlist経由）の取りこぼし検知を兼ねた週次フルスイープ
# 通常runの毎時30分・DLsiteの週次フルスイープ（土曜4:15 JST）と重ならない
# 日曜4:00 JSTに設定。既存関数・既存topicを再利用し、mode違いのペイロードで
# early-stopなしの全ページ走査＋Firestore既知IDとの突合を発火させる（新規関数は増やさない）。
resource "google_cloud_scheduler_job" "fetch_youtube_videos_weekly_full_sweep" {
  project     = var.gcp_project_id
  region      = var.region
  name        = "fetch-youtube-videos-weekly-full-sweep"
  schedule    = "0 4 * * 0" # 毎週日曜4:00 JST
  time_zone   = "Asia/Tokyo"
  description = "YouTube discovery方式の取りこぼし検知（uploads playlist全走査）を週次で実行します"

  pubsub_target {
    topic_name = google_pubsub_topic.youtube_video_fetch_trigger.id
    data = base64encode(jsonencode({
      mode        = "weekly_full_sweep"
      description = "discovery方式の取りこぼし検知を兼ねた週次全件走査"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.youtube_video_fetch_trigger,
    google_pubsub_topic_iam_member.scheduler_pubsub_publisher,
    google_service_account.fetch_youtube_videos_sa,
  ]
}


# 旧 collectDLsiteTimeseries 関連スケジューラーは統合アーキテクチャにより削除済み
#
# Cloud Run warm-up スケジューラー（cloud-run-warmup）は SPR-217 で撤去。
#   - 元目的（SPR-71）は PSI の `/` warm sample で TTFB が跳ねる JIT warmth degradation 対策として
#     オリジンを直接 ping してウォーム維持することだった。
#   - SPR-221 で `/` 含むコンテンツページをエッジキャッシュ化（stale-while-revalidate）したため、
#     PSI/公開ページはエッジ HIT＝オリジンの JIT warmth に依存しなくなり、元目的は陳腐化。
#   - min_instances=0（SPR-217）と併せ、オリジンを温め続ける warm-up を残すと節約が半減するため撤去。
#   - 動的/ログイン系ページはアイドル後初回のみ cold start を許容（低トラフィックのため実害小）。
