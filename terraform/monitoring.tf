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

  # 閾値は max_instances から導く。以前は固定値 5 だったが max_instances は 2 のため構造的に発火しなかった（SPR-326）。
  # 上限に達するとそれ以上スケールできず、超過分のリクエストは待たされる。短い突発（デプロイ時の切替等）は
  # duration で除外し、上限への張り付きだけを通知する。
  conditions {
    display_name = "インスタンス数が上限 (${local.current_env.cloud_run_max_instances}) に張り付き"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/container/instance_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = local.current_env.cloud_run_max_instances - 1

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
    # Cloud Run インスタンス数が上限に張り付き

    suzumina-click-web のインスタンス数が max_instances（terraform/locals.tf）に 5 分以上張り付いています。
    これ以上スケールできないため、超過分のリクエストは待たされるかタイムアウトします。

    ## 確認事項
    1. トラフィックパターン（クローラの急増・DoS の可能性）
    2. 1 リクエストあたりの処理時間が延びていないか（P95 レイテンシアラートと併せて見る）
    3. 恒常的なら max_instances の引き上げとコスト影響の評価
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}