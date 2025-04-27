# ==============================================================================
# モニタリング設定
# ==============================================================================
# 概要: Cloud Run、およびその他のサービスのモニタリングとアラート設定
# ==============================================================================

# カスタムダッシュボードの作成
resource "google_monitoring_dashboard" "cloud_run_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "suzumina.click Cloud Run パフォーマンスダッシュボード",
  "gridLayout": {
    "widgets": [
      {
        "title": "リクエスト数",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [
                      "resource.label.\"service_name\""
                    ]
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "リクエスト数/秒"
            }
          ],
          "yAxis": {
            "scale": "LINEAR",
            "label": "リクエスト/秒"
          },
          "timeshiftDuration": "0s"
        }
      },
      {
        "title": "レイテンシ",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_PERCENTILE_99",
                    "crossSeriesReducer": "REDUCE_MEAN",
                    "groupByFields": [
                      "resource.label.\"service_name\""
                    ]
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "P99レイテンシ"
            },
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_PERCENTILE_50",
                    "crossSeriesReducer": "REDUCE_MEAN",
                    "groupByFields": [
                      "resource.label.\"service_name\""
                    ]
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "P50レイテンシ"
            }
          ],
          "yAxis": {
            "scale": "LINEAR",
            "label": "レイテンシ (ms)"
          },
          "timeshiftDuration": "0s"
        }
      },
      {
        "title": "インスタンス数",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/container/instance_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_MEAN",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [
                      "resource.label.\"service_name\""
                    ]
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "インスタンス数"
            }
          ],
          "yAxis": {
            "scale": "LINEAR",
            "label": "インスタンス数"
          },
          "timeshiftDuration": "0s"
        }
      },
      {
        "title": "エラー率",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\" AND metric.label.\"response_code_class\"!=\"2xx\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [
                      "metric.label.\"response_code_class\""
                    ]
                  }
                }
              },
              "plotType": "LINE",
              "legendTemplate": "エラー数/秒 ({{metric.label.response_code_class}})"
            }
          ],
          "yAxis": {
            "scale": "LINEAR",
            "label": "エラー/秒"
          },
          "timeshiftDuration": "0s"
        }
      }
    ]
  }
}
EOF

  depends_on = [
    google_cloud_run_service.nextjs_app
  ]
}

# 高レイテンシアラート
resource "google_monitoring_alert_policy" "high_latency_alert" {
  display_name = "Cloud Run 高レイテンシアラート"
  combiner     = "OR"
  conditions {
    display_name = "P99レイテンシが500msを超過"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${local.cloudrun_service_name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 500  # 500ms

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id
  ]

  documentation {
    content   = "Cloud Runサービス ${local.cloudrun_service_name} のP99レイテンシが500msを超過しています。パフォーマンスの問題がないか確認してください。"
    mime_type = "text/markdown"
  }

  depends_on = [
    google_cloud_run_service.nextjs_app
  ]
}

# エラー率アラート（修正版）
resource "google_monitoring_alert_policy" "error_rate_alert" {
  display_name = "Cloud Run エラー率アラート"
  combiner     = "OR"
  conditions {
    display_name = "エラーレスポンス数が閾値を超過"
    condition_threshold {
      # エラーレスポンスのみをフィルタリングして監視
      filter     = <<-EOT
        resource.type="cloud_run_revision"
        AND resource.label.service_name="${local.cloudrun_service_name}"
        AND metric.type="run.googleapis.com/request_count"
        AND metric.label.response_code_class!="2xx"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      # 1分間に5回以上のエラーが発生した場合にアラート
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
        # レスポンスコードクラスごとに集計
        group_by_fields = ["metric.label.response_code_class"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id
  ]

  documentation {
    content   = "Cloud Runサービス ${local.cloudrun_service_name} で1分間に5回以上のエラーレスポンスが発生しています。アプリケーションログを確認してください。"
    mime_type = "text/markdown"
  }

  depends_on = [
    google_cloud_run_service.nextjs_app
  ]
}

# メール通知チャネル
resource "google_monitoring_notification_channel" "email" {
  display_name = "開発チーム通知"
  type         = "email"
  labels = {
    email_address = var.alert_email_address
  }
}