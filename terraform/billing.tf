/**
 * billing.tf
 * 予算管理とコストアラートの設定
 */

# プロジェクトの予算設定 (一時的にコメントアウト - 認証の問題により)
# resource "google_billing_budget" "project_budget" {
#   billing_account = data.google_project.current.billing_account
#   display_name    = "${var.gcp_project_id}-${var.environment}-budget"
#
#   budget_filter {
#     projects = ["projects/${var.project_number}"]
#     
#     # サービス固有のフィルタリング（必要に応じて）
#     services = [
#       "services/cloud-run",
#       "services/cloud-functions",
#       "services/cloud-storage",
#       "services/firestore",
#       "services/compute"
#     ]
#   }
#
#   amount {
#     specified_amount {
#       currency_code = "USD"
#       # 環境に応じた予算額を設定
#       units = tostring(coalesce(
#         var.budget_amount,
#         local.current_env.budget_amount
#       ))
#     }
#   }
#
#   # 複数の閾値でアラートを設定
#   dynamic "threshold_rules" {
#     for_each = var.budget_threshold_percent
#     content {
#       threshold_percent = threshold_rules.value / 100
#       spend_basis       = "CURRENT_SPEND"
#     }
#   }
#
#   # 実際の費用とフォーキャスト両方でアラート
#   threshold_rules {
#     threshold_percent = 1.0
#     spend_basis       = "FORECASTED_SPEND"
#   }
#
#   # メール通知の設定
#   all_updates_rule {
#     monitoring_notification_channels = [
#       google_monitoring_notification_channel.email.id
#     ]
#     
#     # 予算超過時にPub/Subにメッセージを送信
#     pubsub_topic = google_pubsub_topic.budget_alerts.id
#   }
# }

# 予算アラート用のPub/Subトピック
resource "google_pubsub_topic" "budget_alerts" {
  name = "${local.resource_prefix}-budget-alerts"
  
  labels = local.common_labels
}

# 予算アラート処理用のCloud Function（将来的な拡張用）
resource "google_pubsub_subscription" "budget_alerts_subscription" {
  name  = "${local.resource_prefix}-budget-alerts-sub"
  topic = google_pubsub_topic.budget_alerts.name

  # メッセージの保持期間
  message_retention_duration = "604800s" # 7日間

  # 未配信メッセージの保持期間
  retain_acked_messages = false
  
  labels = local.common_labels
}

# プロジェクト情報を取得
data "google_project" "current" {
  project_id = var.gcp_project_id
}

# コスト使用量の監視ダッシュボード（オプション）
resource "google_monitoring_dashboard" "cost_overview" {
  count = local.current_env.enable_monitoring ? 1 : 0
  
  dashboard_json = jsonencode({
    displayName = "${var.gcp_project_id} コスト概要ダッシュボード"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "月次コスト推移"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"billing_account\""
                      aggregation = {
                        alignmentPeriod  = "86400s"
                        perSeriesAligner = "ALIGN_SUM"
                      }
                    }
                  }
                  plotType   = "LINE"
                  targetAxis = "Y1"
                }
              ]
              chartOptions = {
                mode = "COLOR"
              }
            }
          }
        }
      ]
    }
  })
}