# ==============================================================================
# DLsite Individual Info API専用関数
# ==============================================================================
# 概要: 100% API-Only アーキテクチャによる革新的データ更新システム
# HTMLスクレイピング完全廃止・Individual Info API（254フィールド）による包括的データ取得
# ==============================================================================

# Individual Info API専用関数の設定
locals {
  dlsite_individual_api_function_name = "fetchDLsiteUnifiedData"
}

# Individual Info API専用作品取得関数 (Gen2) は GitHub Actions でデプロイされるため、
# Terraform では google_cloudfunctions2_function リソースを管理しない（ADR-009 / SPR-92）。
#
# spec の正本（deploy-functions.yml の gcloud functions deploy）:
#   runtime=nodejs<package.json の devEngines.runtime の major> / memory=512Mi / timeout=540s / max-instances=1
#   entry-point=fetchDLsiteUnifiedData / trigger-topic=dlsite-individual-api-trigger
#
# デプロイ手順:
#   1. terraform apply で SA / Pub/Sub トピック / Scheduler / IAM を作成
#   2. GitHub Actions（deploy-functions.yml）が関数本体をデプロイ
#
# resource "google_cloudfunctions2_function" "fetch_dlsite_works_individual_api" {
#   # GitHub Actions によるデプロイとの競合を避けるためコメントアウト（ADR-009 / SPR-92）。
# }

# Individual Info API専用のPub/Subトピック
resource "google_pubsub_topic" "dlsite_individual_api_trigger" {
  project = var.gcp_project_id
  name    = "dlsite-individual-api-trigger"

  labels = {
    environment = var.environment
    function    = "dlsite-individual-api"
    api-only    = "true"
    managed-by  = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# Individual Info API専用のCloud Scheduler（1時間ごと実行・3時台を除く＝1日23回）
#
# 2時間ごと → 1時間ごと（SPR-412）: DLsite のレート制限（推定 約100リクエスト/分）に合わせて
# 取得ペースを落とした結果、1 run で取得できるのは 450件までになった（SPR-410 / SPR-411）。
# 2時間ごと（12回/日）では 1日 5,400件で、必要量（volatile × 回数 + stable 約2,100件）に
# 余裕が無く、stable が1日で一巡しなかった。制限は分単位で、約1時間間隔で3回続けて走らせても
# 429 は出なかった（2026-11-15 実測）。時間単位・日単位の枠が無いことまでは未確認なので、
# 「DLsite Rate Limited Alert」が毎 run 鳴るようなら `3 */2 * * *` に戻す（戻すのはこの1行。
# run 途絶アラートの duration＝monitoring_dlsite.tf は 3h のままでも 2h 周期で誤発火しない）。
#
# 3時台を飛ばすのは、日曜 3:00 の checkDataIntegrity（約7分・works / circles / creators を
# 読んで事後修復する）と同時に走らせないため。2時間ごとのときは 2:03 と 4:03 で重ならなかった。
# その関係を保つ（曜日で分けると式が2本になるので、毎日飛ばしている）。
resource "google_cloud_scheduler_job" "fetch_dlsite_individual_api_hourly" {
  project = var.gcp_project_id
  region  = var.region
  name    = "fetch-dlsite-individual-api-hourly" # 名前は互換性のため変更しない

  description = "Individual Info API専用データ更新（1時間間隔・3時台を除く・取得漏れ防止のため3分後実行）"
  schedule    = "3 0-2,4-23 * * *" # 毎時3分に実行（0:03, 1:03, 2:03, 4:03 ... 23:03。3:03 は無い）
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_individual_api_trigger.id
    data = base64encode(jsonencode({
      type        = "unified_update"
      mode        = "individual_info_api_unified"
      description = "統合アーキテクチャによる基本データ+時系列データ収集"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_individual_api_trigger,
  ]
}

# SPR-229 Stage②: ティア差分の取りこぼし検知を兼ねた週次フルスイープ
# 通常runの毎時3分（run は長くて約8分＝4:03 の run は 4:11 ごろ終わる）・checkDataIntegrityの日曜3:00 JSTと重ならない
# 土曜4:15 JSTに設定。既存関数・既存トピックを再利用し、mode違いのペイロードで
# フルスイープ(ティア差分を無視した全件取得)を発火させる（新規関数は増やさない）。
resource "google_cloud_scheduler_job" "fetch_dlsite_individual_api_weekly_full_sweep" {
  project = var.gcp_project_id
  region  = var.region
  name    = "fetch-dlsite-individual-api-weekly-full-sweep"

  description = "ティア差分の週次フルスイープ（取りこぼし検知・全件強制取得）"
  schedule    = "15 4 * * 6" # 毎週土曜4:15 JST
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_individual_api_trigger.id
    data = base64encode(jsonencode({
      type        = "unified_update"
      mode        = "weekly_full_sweep"
      description = "ティア差分の取りこぼし検知を兼ねた週次全件取得"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_individual_api_trigger,
  ]
}

# Cloud Scheduler から Individual Info API Function を呼び出すための権限
resource "google_pubsub_topic_iam_member" "scheduler_individual_api_pubsub_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.dlsite_individual_api_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# Individual Info API関数のログベースメトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_errors" {
#   # Individual Info APIメトリクスを有効化
#   name   = "dlsite_individual_api_errors"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# severity>=ERROR
# EOF
#
#   metric_descriptor {
#     metric_kind = "CUMULATIVE"
#     value_type  = "INT64"
#     display_name = "DLsite Individual Info API エラー数"
#   }
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API成功率監視用メトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_success" {
#   # Individual Info API成功メトリクスを有効化
#   name   = "dlsite_individual_api_success"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# jsonPayload.message="Individual Info API処理完了"
# EOF
#
#   metric_descriptor {
#     metric_kind = "CUMULATIVE"
#     value_type  = "INT64"
#     display_name = "DLsite Individual Info API 成功数"
#   }
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API品質監視用メトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_quality" {
#   # Individual Info API品質メトリクスを有効化
#   name   = "dlsite_individual_api_quality"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# jsonPayload.message="データ品質検証"
# EOF
#
#   metric_descriptor {
#     metric_kind = "GAUGE"
#     value_type  = "DOUBLE"
#     display_name = "DLsite Individual Info API データ品質スコア"
#   }
#
#   value_extractor = "EXTRACT(jsonPayload.quality_score)"
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API関数の出力情報（手動デプロイのためコメントアウト）
# output "fetch_dlsite_individual_api_function_info" {
#   value = {
#     name = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.name
#     id = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.id
#     url = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.url
#   }
#   description = "Individual Info API専用DLsite作品取得関数の情報"
# }

# Individual Info API専用トピック情報
output "dlsite_individual_api_topic_info" {
  value = {
    name = google_pubsub_topic.dlsite_individual_api_trigger.name
    id   = google_pubsub_topic.dlsite_individual_api_trigger.id
  }
  description = "Individual Info API専用Pub/Subトピックの情報"
}

# Individual Info API移行完了のアラート（手動デプロイのためコメントアウト）
# resource "google_monitoring_alert_policy" "individual_api_migration_complete" {
#   # Individual Info APIアラートを有効化
#   display_name = "DLsite Individual Info API移行完了アラート"
#   combiner     = "OR"
#   
#   conditions {
#     display_name = "Individual Info API移行完了検出"
#     
#     condition_threshold {
#       filter          = "resource.type=\"cloud_function\" resource.labels.function_name=\"${local.dlsite_individual_api_function_name}\" metric.type=\"logging.googleapis.com/user/dlsite_individual_api_success\""
#       duration        = "60s"
#       comparison      = "COMPARISON_GT"
#       threshold_value = 0
#       
#       aggregations {
#         alignment_period   = "300s"
#         per_series_aligner = "ALIGN_RATE"
#       }
#     }
#   }
#
#   notification_channels = [
#     google_monitoring_notification_channel.email.id
#   ]
#
#   alert_strategy {
#     notification_rate_limit {
#       period = "300s"
#     }
#   }
#
#   depends_on = [
#     google_logging_metric.individual_api_success,
#     google_monitoring_notification_channel.email,
#   ]
# }