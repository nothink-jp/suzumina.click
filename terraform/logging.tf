/**
 * logging.tf
 * Cloud Logging設定 - ログ保存とシンク設定
 */

# アプリケーションログ用のログシンク
resource "google_logging_project_sink" "application_logs" {
  name        = "suzumina-click-application-logs"
  destination = "storage.googleapis.com/${google_storage_bucket.log_storage.name}"
  
  # Cloud Runとフロントエンドのログをフィルタリング
  filter = <<-EOT
    (resource.type="cloud_run_revision" AND resource.labels.service_name="suzumina-click-web")
    OR
    (resource.type="cloud_function" AND resource.labels.function_name=~"fetch.*")
    OR
    (jsonPayload.metric_type="frontend_performance" OR jsonPayload.metric_type="core_web_vitals")
  EOT

  # BigQueryテーブルのスキーマ設定
  bigquery_options {
    use_partitioned_tables = true
  }

  depends_on = [google_storage_bucket.log_storage]
}

# ログ保存用のCloud Storageバケット
resource "google_storage_bucket" "log_storage" {
  name     = "${var.project_id}-application-logs"
  location = var.region
  
  # ライフサイクル管理（90日後に削除）
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  # 暗号化設定
  encryption {
    default_kms_key_name = google_kms_crypto_key.log_encryption_key.id
  }

  depends_on = [google_kms_crypto_key.log_encryption_key]
}

# ログ暗号化用のKMSキー
resource "google_kms_key_ring" "log_key_ring" {
  name     = "suzumina-click-log-keys"
  location = var.region
}

resource "google_kms_crypto_key" "log_encryption_key" {
  name     = "log-encryption-key"
  key_ring = google_kms_key_ring.log_key_ring.id
  
  # キーローテーション（90日ごと）
  rotation_period = "7776000s" # 90日
}

# Cloud Loggingサービスアカウントに権限付与
resource "google_storage_bucket_iam_binding" "log_storage_writer" {
  bucket = google_storage_bucket.log_storage.name
  role   = "roles/storage.objectCreator"
  
  members = [
    "serviceAccount:${google_logging_project_sink.application_logs.writer_identity}"
  ]
}

# パフォーマンスメトリクス用のログベースメトリクス
resource "google_logging_metric" "web_vitals_lcp" {
  name   = "web_vitals_lcp"
  filter = "jsonPayload.webVitals.metric=\"LCP\""
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "DOUBLE"
    display_name = "Core Web Vitals - Largest Contentful Paint"
  }
  
  value_extractor = "EXTRACT(jsonPayload.webVitals.value)"
  
  label_extractors = {
    "url"        = "EXTRACT(jsonPayload.webVitals.url)"
    "user_agent" = "EXTRACT(jsonPayload.webVitals.userAgent)"
  }
}

resource "google_logging_metric" "web_vitals_fid" {
  name   = "web_vitals_fid"
  filter = "jsonPayload.webVitals.metric=\"FID\""
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "DOUBLE"
    display_name = "Core Web Vitals - First Input Delay"
  }
  
  value_extractor = "EXTRACT(jsonPayload.webVitals.value)"
  
  label_extractors = {
    "url"        = "EXTRACT(jsonPayload.webVitals.url)"
    "user_agent" = "EXTRACT(jsonPayload.webVitals.userAgent)"
  }
}

resource "google_logging_metric" "web_vitals_cls" {
  name   = "web_vitals_cls"
  filter = "jsonPayload.webVitals.metric=\"CLS\""
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "DOUBLE"
    display_name = "Core Web Vitals - Cumulative Layout Shift"
  }
  
  value_extractor = "EXTRACT(jsonPayload.webVitals.value)"
  
  label_extractors = {
    "url"        = "EXTRACT(jsonPayload.webVitals.url)"
    "user_agent" = "EXTRACT(jsonPayload.webVitals.userAgent)"
  }
}

# エラーログ用のメトリクス
resource "google_logging_metric" "application_errors" {
  name   = "application_errors_count"
  filter = <<-EOT
    (resource.type="cloud_run_revision" AND resource.labels.service_name="suzumina-click-web" AND severity>=ERROR)
    OR
    (resource.type="cloud_function" AND severity>=ERROR)
  EOT
  
  metric_descriptor {
    metric_kind = "COUNTER"
    value_type  = "INT64"
    display_name = "Application Error Count"
  }
  
  label_extractors = {
    "service_name" = "EXTRACT(resource.labels.service_name)"
    "severity"     = "EXTRACT(severity)"
  }
}

# ログベースアラート - 高エラー率
resource "google_monitoring_alert_policy" "high_error_rate_logs" {
  display_name = "ログベース - 高エラー率アラート"
  combiner     = "OR"
  
  conditions {
    display_name = "エラーログ急増 (> 10件/分)"
    
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/application_errors_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
      
      trigger {
        count = 1
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]
  
  documentation {
    content = <<-EOT
    # ログベース高エラー率アラート
    
    アプリケーションエラーログが1分間に10件を超えました。
    システムに深刻な問題が発生している可能性があります。
    
    ## 対応アクション
    1. Cloud Loggingでエラー詳細を確認
    2. エラーパターンの分析
    3. 影響範囲の特定
    4. 緊急対応の実施
    
    ## 調査リンク
    - Cloud Logging: https://console.cloud.google.com/logs
    - Error Reporting: https://console.cloud.google.com/errors
    EOT
    mime_type = "text/markdown"
  }
  
  project = var.gcp_project_id
  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.application_errors
  ]
}

# アプリケーションログ閲覧用のカスタムダッシュボード
resource "google_monitoring_dashboard" "logging_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "suzumina.click ログ分析ダッシュボード",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "height": 4,
        "widget": {
          "title": "エラーログ数 - 時系列",
          "xyChart": {
            "chartOptions": {
              "mode": "COLOR"
            },
            "dataSets": [
              {
                "minAlignmentPeriod": "60s",
                "plotType": "LINE",
                "targetAxis": "Y1",
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    },
                    "filter": "metric.type=\"logging.googleapis.com/user/application_errors_count\"",
                    "groupByFields": ["metric.label.service_name"]
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "エラー数/分",
              "scale": "LINEAR"
            }
          }
        },
        "width": 6,
        "xPos": 0,
        "yPos": 0
      },
      {
        "height": 4,
        "widget": {
          "title": "Core Web Vitals - LCP分布",
          "xyChart": {
            "chartOptions": {
              "mode": "COLOR"
            },
            "dataSets": [
              {
                "minAlignmentPeriod": "300s",
                "plotType": "LINE",
                "targetAxis": "Y1",
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_95"
                    },
                    "filter": "metric.type=\"logging.googleapis.com/user/web_vitals_lcp\""
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "LCP (ms)",
              "scale": "LINEAR"
            }
          }
        },
        "width": 6,
        "xPos": 6,
        "yPos": 0
      }
    ]
  }
}
EOF

  project = var.gcp_project_id
}

# ログ保存バケット名を出力
output "log_storage_bucket" {
  description = "Log storage bucket name"
  value       = google_storage_bucket.log_storage.name
}

# ログシンク名を出力
output "log_sink_name" {
  description = "Log sink name"
  value       = google_logging_project_sink.application_logs.name
}