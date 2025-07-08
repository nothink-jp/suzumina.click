# ==============================================================================
# DLsite Individual Info API専用関数
# ==============================================================================
# 概要: 100% API-Only アーキテクチャによる革新的データ更新システム
# HTMLスクレイピング完全廃止・Individual Info API（254フィールド）による包括的データ取得
# ==============================================================================

# Individual Info API専用関数の設定
locals {
  dlsite_individual_api_function_name = "fetchDLsiteWorksIndividualAPI"
  dlsite_individual_api_runtime       = "nodejs22"
  dlsite_individual_api_entry_point   = "fetchDLsiteWorksIndividualAPI"
  dlsite_individual_api_memory        = "2Gi"  # Individual Info API処理用大容量メモリ
  dlsite_individual_api_timeout       = 540    # 9分タイムアウト（API集約処理）
}

# Individual Info API専用作品取得関数（環境設定により条件付き作成）
resource "google_cloudfunctions2_function" "fetch_dlsite_works_individual_api" {
  count = local.current_env.functions_enabled ? 1 : 0
  
  project  = var.gcp_project_id
  name     = local.dlsite_individual_api_function_name
  location = var.region

  # ビルド設定
  build_config {
    runtime     = local.dlsite_individual_api_runtime
    entry_point = local.dlsite_individual_api_entry_point
    # 初回デプロイ用にダミーのソースコードを設定
    # GitHub Actionsによる実際のデプロイでは上書きされる
    source {
      storage_source {
        bucket = google_storage_bucket.functions_deployment.name
        object = "function-source-dummy.zip"
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 2       # Individual Info API並列処理対応
    min_instance_count = 0       # コールドスタートを許容
    available_memory   = local.dlsite_individual_api_memory
    timeout_seconds    = local.dlsite_individual_api_timeout
    
    # 専用のサービスアカウントを使用
    service_account_email = google_service_account.fetch_dlsite_works_sa.email

    # Individual Info API処理用環境変数
    environment_variables = {
      FUNCTION_SIGNATURE_TYPE = "cloudevent"
      FUNCTION_TARGET        = local.dlsite_individual_api_entry_point
      
      # Individual Info API設定
      INDIVIDUAL_INFO_API_ENABLED = "true"
      API_ONLY_MODE              = "true"
      MAX_CONCURRENT_API_REQUESTS = "5"
      API_REQUEST_DELAY_MS       = "500"
      
      # データ品質設定
      ENABLE_DATA_VALIDATION = "true"
      MINIMUM_QUALITY_SCORE  = "80"
      
      # 時系列データ統合
      ENABLE_TIMESERIES_INTEGRATION = "true"
      
      # ログレベル
      LOG_LEVEL = "info"
    }
  }

  # Pub/Subトリガー設定
  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.dlsite_individual_api_trigger.id
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY"
    service_account_email = google_service_account.fetch_dlsite_works_sa.email
  }

  # GitHub Actions からのデプロイとの競合を避けるため、
  # ソースコードと環境変数は GitHub Actions が管理し、Terraform は無視する
  lifecycle {
    ignore_changes = [
      build_config,
      service_config[0].environment_variables,
    ]
    create_before_destroy = false
  }

  depends_on = [
    google_firestore_database.database,
    google_pubsub_topic.dlsite_individual_api_trigger,
    google_project_iam_member.fetch_dlsite_works_firestore_user,
    google_project_iam_member.fetch_dlsite_works_log_writer,
    google_service_account.fetch_dlsite_works_sa,
  ]
}

# Individual Info API専用のPub/Subトピック
resource "google_pubsub_topic" "dlsite_individual_api_trigger" {
  project = var.gcp_project_id
  name    = "dlsite-individual-api-trigger"
  
  labels = {
    environment    = var.environment
    function       = "dlsite-individual-api"
    api-only       = "true"
    managed-by     = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# Individual Info API専用のCloud Scheduler（日次実行）
resource "google_cloud_scheduler_job" "fetch_dlsite_individual_api_daily" {
  project  = var.gcp_project_id
  region   = var.region
  name     = "fetch-dlsite-individual-api-daily"
  
  description = "Individual Info API専用データ更新（日次実行・100% API-Only）"
  schedule    = "0 1 * * *"  # 毎日午前1時（JST）
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_individual_api_trigger.id
    data       = base64encode(jsonencode({
      type = "daily_update"
      mode = "individual_info_api_only"
      description = "100% API-Only アーキテクチャ日次更新"
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

# Individual Info API関数のログベースメトリクス（エラー監視）
resource "google_logging_metric" "individual_api_errors" {
  name   = "dlsite_individual_api_errors"
  filter = <<EOF
resource.type="cloud_function"
resource.labels.function_name="${local.dlsite_individual_api_function_name}"
severity>=ERROR
EOF

  metric_descriptor {
    metric_kind = "CUMULATIVE"
    value_type  = "INT64"
    display_name = "DLsite Individual Info API エラー数"
  }

  depends_on = [
    google_cloudfunctions2_function.fetch_dlsite_works_individual_api
  ]
}

# Individual Info API成功率監視用メトリクス
resource "google_logging_metric" "individual_api_success" {
  name   = "dlsite_individual_api_success"
  filter = <<EOF
resource.type="cloud_function"
resource.labels.function_name="${local.dlsite_individual_api_function_name}"
jsonPayload.message="Individual Info API処理完了"
EOF

  metric_descriptor {
    metric_kind = "CUMULATIVE"
    value_type  = "INT64"
    display_name = "DLsite Individual Info API 成功数"
  }

  depends_on = [
    google_cloudfunctions2_function.fetch_dlsite_works_individual_api
  ]
}

# Individual Info API品質監視用メトリクス
resource "google_logging_metric" "individual_api_quality" {
  name   = "dlsite_individual_api_quality"
  filter = <<EOF
resource.type="cloud_function"
resource.labels.function_name="${local.dlsite_individual_api_function_name}"
jsonPayload.message="データ品質検証"
EOF

  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "DOUBLE"
    display_name = "DLsite Individual Info API データ品質スコア"
  }

  value_extractor = "EXTRACT(jsonPayload.quality_score)"

  depends_on = [
    google_cloudfunctions2_function.fetch_dlsite_works_individual_api
  ]
}

# Individual Info API関数の出力情報
output "fetch_dlsite_individual_api_function_info" {
  value = local.current_env.functions_enabled ? {
    name     = google_cloudfunctions2_function.fetch_dlsite_works_individual_api[0].name
    location = google_cloudfunctions2_function.fetch_dlsite_works_individual_api[0].location
    state    = google_cloudfunctions2_function.fetch_dlsite_works_individual_api[0].state
    url      = google_cloudfunctions2_function.fetch_dlsite_works_individual_api[0].service_config[0].uri
  } : null
  description = "Individual Info API専用DLsite作品取得関数の情報"
}

# Individual Info API専用トピック情報
output "dlsite_individual_api_topic_info" {
  value = {
    name = google_pubsub_topic.dlsite_individual_api_trigger.name
    id   = google_pubsub_topic.dlsite_individual_api_trigger.id
  }
  description = "Individual Info API専用Pub/Subトピックの情報"
}

# Individual Info API移行完了のアラート（オプション）
resource "google_monitoring_alert_policy" "individual_api_migration_complete" {
  display_name = "DLsite Individual Info API移行完了アラート"
  combiner     = "OR"
  
  conditions {
    display_name = "Individual Info API移行完了検出"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_function\" resource.labels.function_name=\"${local.dlsite_individual_api_function_name}\" metric.type=\"logging.googleapis.com/user/dlsite_individual_api_success\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id
  ]

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }

  depends_on = [
    google_logging_metric.individual_api_success,
    google_monitoring_notification_channel.email,
  ]
}