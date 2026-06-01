/**
 * monitoring.tf
 * Cloud Monitoring関連のリソース定義
 */
# 重要なアラートポリシー
resource "google_monitoring_alert_policy" "cloud_run_error_rate" {
  display_name = "Cloud Run エラー率アラート"
  combiner     = "OR"

  conditions {
    display_name = "高エラー率検知 (5xx > 5%)"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05 # 5%

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
    content   = <<-EOT
    # Cloud Run エラー率が閾値を超過
    
    suzumina-click-web サービスでエラーレート(5xx)が 5% を超えました。
    緊急対応が必要です。
    
    ## 確認事項
    1. Cloud Loggingでエラー詳細を確認
    2. 最新のデプロイとの関連を確認
    3. 必要に応じて自動/手動ロールバック
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}

# 通知チャンネル - メール
resource "google_monitoring_notification_channel" "email" {
  display_name = "管理者メール通知"
  type         = "email"

  labels = {
    email_address = var.admin_email
  }

  project = var.gcp_project_id
}

# Cloud Run 自動スケーリングのアラート
resource "google_monitoring_alert_policy" "cloud_run_scaling" {
  display_name = "Cloud Run スケーリング通知"
  combiner     = "OR"

  conditions {
    display_name = "インスタンス数が急増 (> 5)"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/container/instance_count\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5 # インスタンス数閾値

      aggregations {
        alignment_period   = "60s"
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
    content   = <<-EOT
    # Cloud Run インスタンス数急増
    
    suzumina-click-web サービスのインスタンス数が急増しました。
    トラフィック増加または異常な負荷が考えられます。
    
    ## 確認事項
    1. トラフィックパターンの確認
    2. DoS攻撃の可能性確認
    3. コスト影響の評価
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}