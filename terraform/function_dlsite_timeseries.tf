# DLsite時系列データ収集Cloud Function
# Individual Info APIによる6地域価格・販売・評価データの収集と日次集計処理

# =================================================================
# サービスアカウント
# =================================================================

# DLsite時系列データ収集関数専用のサービスアカウント
# 最小権限の原則に従い、必要最小限のFirestore権限のみを付与
resource "google_service_account" "collect_dlsite_timeseries_sa" {
  project      = var.gcp_project_id
  account_id   = "collect-dlsite-timeseries-sa"
  display_name = "DLsite時系列データ収集Cloud Function用サービスアカウント"
  description  = "DLsite時系列データ収集・日次集計・データクリーンアップを実行するCloud Function専用"
}

# =================================================================
# IAM権限設定
# =================================================================

# Firestoreデータベースユーザー権限（時系列データ専用コレクション）
resource "google_project_iam_member" "collect_dlsite_timeseries_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.collect_dlsite_timeseries_sa.email}"
}

# Cloud Logging書き込み権限
resource "google_project_iam_member" "collect_dlsite_timeseries_logging_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.collect_dlsite_timeseries_sa.email}"
}

# Monitoring メトリクス書き込み権限
resource "google_project_iam_member" "collect_dlsite_timeseries_monitoring_writer" {
  project = var.gcp_project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.collect_dlsite_timeseries_sa.email}"
}

# =================================================================
# Cloud Function (第2世代)
# =================================================================

# DLsite時系列データ収集Cloud Function
# Pub/Subトリガーで時系列データ収集・日次集計・データクリーンアップを実行
# Temporarily disabled due to source file issues - will be deployed via GitHub Actions
resource "google_cloudfunctions2_function" "collect_dlsite_timeseries" {
  count = 0  # Temporarily disabled
  project  = var.gcp_project_id
  location = var.region
  name     = "collectDLsiteTimeseries"

  description = "DLsite時系列データ収集・日次集計・データクリーンアップ機能"

  # ビルド設定
  build_config {
    runtime     = "nodejs22"
    entry_point = "collectDLsiteTimeseries"
    # 初回デプロイ用にダミーのソースコードを設定
    # GitHub Actionsによる実際のデプロイでは上書きされる
    source {
      storage_source {
        bucket = google_storage_bucket.functions_deployment.name
        object = "function-source-dummy.zip"
      }
    }
  }

  # GitHub Actions からのデプロイとの競合を避けるため、
  # ソースコードと環境変数は GitHub Actions が管理し、Terraform は無視する
  lifecycle {
    ignore_changes = [
      build_config,
      service_config[0].environment_variables,
      service_config[0].secret_environment_variables
    ]
  }

  service_config {
    # パフォーマンス設定
    max_instance_count               = 3  # 並列実行制限（コスト最適化）
    min_instance_count               = 0  # コールドスタート許可
    available_memory                 = "1Gi"  # 時系列処理用メモリ
    timeout_seconds                  = 540    # 9分タイムアウト（最大実行時間）
    max_instance_request_concurrency = 1      # インスタンス当たり1リクエスト

    # セキュリティ設定
    service_account_email            = google_service_account.collect_dlsite_timeseries_sa.email
    ingress_settings                = "ALLOW_INTERNAL_ONLY"  # 内部トラフィックのみ

    # 環境変数
    environment_variables = {
      # Google Cloud設定
      GOOGLE_CLOUD_PROJECT = var.gcp_project_id
      GCLOUD_PROJECT       = var.gcp_project_id
      
      # Firestore設定
      FIRESTORE_PROJECT_ID = var.gcp_project_id
      
      # DLsite API設定
      DLSITE_MAX_PAGES_PER_EXECUTION = "50"  # バッチサイズ制限
      DLSITE_REQUEST_DELAY_MS        = "2000" # API呼び出し間隔
      DLSITE_MAX_CONCURRENT_REQUESTS = "5"    # 並列実行数制限
      
      # 時系列データ設定
      TIMESERIES_BATCH_SIZE          = "50"   # 時系列データバッチサイズ
      TIMESERIES_RETENTION_DAYS      = "7"    # 生データ保持期間
      
      # ログレベル設定
      LOG_LEVEL = "info"
      NODE_ENV  = "production"
    }

    # 秘密情報（Secret Manager経由）
    secret_environment_variables {
      key        = "DISCORD_CLIENT_SECRET"
      project_id = var.gcp_project_id
      secret     = google_secret_manager_secret.secrets["DISCORD_CLIENT_SECRET"].secret_id
      version    = "latest"
    }
  }

  # Pub/Subトリガー設定
  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.dlsite_timeseries_collect_trigger.id
    retry_policy   = "RETRY_POLICY_RETRY"  # 失敗時リトライ有効
  }

  depends_on = [
    # 基盤サービス依存
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.run,
    google_project_service.eventarc,
    
    # IAM権限依存
    google_service_account.collect_dlsite_timeseries_sa,
    google_project_iam_member.collect_dlsite_timeseries_firestore_user,
    google_project_iam_member.collect_dlsite_timeseries_logging_writer,
    google_project_iam_member.collect_dlsite_timeseries_monitoring_writer,
    
    # Pub/Sub依存
    google_pubsub_topic.dlsite_timeseries_collect_trigger,
    
    # 秘密情報依存
    google_secret_manager_secret.secrets,
  ]
}

# =================================================================
# 関数実行権限
# =================================================================

# Cloud Scheduler から関数を呼び出すための権限
resource "google_cloudfunctions2_function_iam_member" "collect_dlsite_timeseries_invoker" {
  count = 0  # Temporarily disabled
  
  project        = var.gcp_project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.collect_dlsite_timeseries[0].name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# Pub/Sub サービスアカウントからの関数呼び出し権限
resource "google_cloudfunctions2_function_iam_member" "collect_dlsite_timeseries_pubsub_invoker" {
  count = 0  # Temporarily disabled
  
  project        = var.gcp_project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.collect_dlsite_timeseries[0].name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# =================================================================
# モニタリング・アラート設定
# =================================================================

# 時系列データ収集関数のログベースメトリクス（エラー率監視）
resource "google_logging_metric" "collect_dlsite_timeseries_errors" {
  count = 0  # Temporarily disabled
  name   = "dlsite_timeseries_collection_errors"
  filter = <<EOF
resource.type="cloud_function"
resource.labels.function_name="collectDLsiteTimeseries"
severity>=ERROR
EOF

  metric_descriptor {
    metric_kind = "CUMULATIVE"
    value_type  = "INT64"
    display_name = "DLsite時系列データ収集エラー数"
  }

  depends_on = [
    google_cloudfunctions2_function.collect_dlsite_timeseries
  ]
}

# 時系列データ収集成功率監視用メトリクス
resource "google_logging_metric" "collect_dlsite_timeseries_success" {
  count = 0  # Temporarily disabled
  name   = "dlsite_timeseries_collection_success"
  filter = <<EOF
resource.type="cloud_function"
resource.labels.function_name="collectDLsiteTimeseries"
jsonPayload.operation="executeTimeseriesCollection"
jsonPayload.success=true
EOF

  metric_descriptor {
    metric_kind = "CUMULATIVE"
    value_type  = "INT64"
    display_name = "DLsite時系列データ収集成功数"
  }

  depends_on = [
    google_cloudfunctions2_function.collect_dlsite_timeseries
  ]
}