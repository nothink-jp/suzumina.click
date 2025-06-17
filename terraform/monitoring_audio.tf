/**
 * monitoring_audio.tf
 * 音声ボタン機能の監視とアラート設定
 */

# 音声ボタン機能監視ダッシュボード
resource "google_monitoring_dashboard" "audio_button_overview" {
  dashboard_json = <<EOF
{
  "displayName": "suzumina.click 音声ボタン機能監視",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "height": 4,
        "widget": {
          "title": "音声ボタン - Firestore読み取り操作",
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
                      "perSeriesAligner": "ALIGN_RATE"
                    },
                    "filter": "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/read_count\" AND metadata.user_labels.collection=\"audioButtons\"",
                    "secondaryAggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_SUM"
                    }
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "読み取り操作数",
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
          "title": "音声ボタン - Cloud Storage読み取り",
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
                      "perSeriesAligner": "ALIGN_RATE"
                    },
                    "filter": "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${var.gcp_project_id}-audio-files\" AND metric.type=\"storage.googleapis.com/api/request_count\" AND metric.labels.method=\"GET\"",
                    "secondaryAggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_SUM"
                    }
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "音声ファイル読み取り数",
              "scale": "LINEAR"
            }
          }
        },
        "width": 6,
        "xPos": 6,
        "yPos": 0
      },
      {
        "height": 4,
        "widget": {
          "title": "音声ボタン - アップロード統計",
          "xyChart": {
            "chartOptions": {
              "mode": "COLOR"
            },
            "dataSets": [
              {
                "minAlignmentPeriod": "3600s",
                "plotType": "LINE",
                "targetAxis": "Y1",
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_RATE"
                    },
                    "filter": "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/write_count\" AND metadata.user_labels.collection=\"audioButtons\"",
                    "secondaryAggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_SUM"
                    }
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "新規音声ボタン数",
              "scale": "LINEAR"
            }
          }
        },
        "width": 6,
        "xPos": 0,
        "yPos": 4
      },
      {
        "height": 4,
        "widget": {
          "title": "Cloud Storage - 使用容量と帯域",
          "xyChart": {
            "chartOptions": {
              "mode": "COLOR"
            },
            "dataSets": [
              {
                "minAlignmentPeriod": "3600s",
                "plotType": "LINE",
                "targetAxis": "Y1",
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    },
                    "filter": "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${var.gcp_project_id}-audio-files\" AND metric.type=\"storage.googleapis.com/storage/total_bytes\"",
                    "secondaryAggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_MAX"
                    }
                  }
                }
              },
              {
                "minAlignmentPeriod": "300s",
                "plotType": "LINE",
                "targetAxis": "Y2",
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_RATE"
                    },
                    "filter": "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${var.gcp_project_id}-audio-files\" AND metric.type=\"storage.googleapis.com/network/sent_bytes_count\"",
                    "secondaryAggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_SUM"
                    }
                  }
                }
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "ストレージ使用量 (bytes)",
              "scale": "LINEAR"
            },
            "y2Axis": {
              "label": "送信バイト数 (bytes/s)",
              "scale": "LINEAR"
            }
          }
        },
        "width": 6,
        "xPos": 6,
        "yPos": 4
      }
    ]
  }
}
EOF

  project = var.gcp_project_id
}

# 音声ボタン機能のアラートポリシー
resource "google_monitoring_alert_policy" "audio_storage_quota" {
  display_name = "音声ストレージ容量アラート"
  combiner     = "OR"
  
  conditions {
    display_name = "ストレージ使用量が上限に近づいています (80%)"
    
    condition_threshold {
      filter          = "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${var.gcp_project_id}-audio-files\" AND metric.type=\"storage.googleapis.com/storage/total_bytes\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10737418240  # 10GB (bytes)
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MAX"
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
    # 音声ストレージ容量警告
    
    音声ファイル用Cloud Storageの使用量が10GBを超えました。
    容量制限やコスト管理の確認が必要です。
    
    ## 対応事項
    1. 不要な音声ファイルの削除
    2. ライフサイクルポリシーの見直し
    3. ストレージクラスの最適化検討
    4. 必要に応じてクォータ引き上げ
    EOT
    mime_type = "text/markdown"
  }
  
  depends_on = [google_monitoring_notification_channel.email]
  project = var.gcp_project_id
}

# 音声ボタンAPI異常アラート
resource "google_monitoring_alert_policy" "audio_button_api_errors" {
  display_name = "音声ボタンAPI エラー率アラート"
  combiner     = "OR"
  
  conditions {
    display_name = "音声ボタンAPI高エラー率検知 (> 10%)"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-nextjs-app\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\" AND metadata.user_labels.endpoint=\"/api/audio-buttons\""
      duration        = "180s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.1  # 10%
      
      aggregations {
        alignment_period   = "180s"
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
    # 音声ボタンAPI エラー率異常
    
    音声ボタン関連APIでエラー率が10%を超えました。
    音声機能の利用に支障が発生している可能性があります。
    
    ## 緊急対応事項
    1. 音声ボタン機能の動作確認
    2. Firestore接続状況確認
    3. Cloud Storage認証確認
    4. Server Actionsのエラーログ確認
    EOT
    mime_type = "text/markdown"
  }
  
  depends_on = [google_monitoring_notification_channel.email]
  project = var.gcp_project_id
}

# 高頻度アクセスアラート（DDoS/異常使用検知）
resource "google_monitoring_alert_policy" "audio_high_frequency_access" {
  display_name = "音声ボタン高頻度アクセス検知"
  combiner     = "OR"
  
  conditions {
    display_name = "音声ファイル異常アクセス検知 (> 1000 req/min)"
    
    condition_threshold {
      filter          = "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${var.gcp_project_id}-audio-files\" AND metric.type=\"storage.googleapis.com/api/request_count\""
      duration        = "120s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000  # 1000 requests/min
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
      
      trigger {
        count = 2
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]
  
  documentation {
    content = <<-EOT
    # 音声ファイル異常アクセス検知
    
    音声ファイルへのアクセスが通常より大幅に増加しています。
    DDoS攻撃や異常な使用パターンの可能性があります。
    
    ## 対応事項
    1. アクセスログの分析
    2. 異常なIPアドレスの特定
    3. 必要に応じてCloud Armorの設定
    4. レート制限の検討
    EOT
    mime_type = "text/markdown"
  }
  
  depends_on = [google_monitoring_notification_channel.email]
  project = var.gcp_project_id
}