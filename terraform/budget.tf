# ==============================================================================
# 予算管理と最適化設定
# ==============================================================================
# 概要: GCPプロジェクトの予算管理とコスト最適化のための設定
# ==============================================================================

# 月次予算の設定
# 注：予算設定を行う場合は以下の設定が必要
# 1. gcloud auth application-default set-quota-project <project-id>
# 2. gcloud services enable billingbudgets.googleapis.com --project=<project-id>
# 3. gcloud beta billing accounts get-iam-policy <billing-account-id>
# 4. 必要に応じて権限設定: gcloud beta billing accounts add-iam-policy-binding <billing-account-id> --member=user:<email> --role=roles/billing.admin
resource "google_billing_budget" "monthly_budget" {
  # 予算設定が有効かつ、BillingBudgetAPIが利用可能な場合のみ作成
  count = var.enable_budget ? 1 : 0
  
  # エラー発生時の再試行を無効化（エラーでブロックされないように）
  lifecycle {
    # エラーが発生しても続行
    ignore_changes = all
  }
  
  billing_account = var.billing_account_id
  display_name    = "suzumina.click 月間予算"
  
  # 予算金額の設定（毎月設定された金額）
  amount {
    specified_amount {
      currency_code = "JPY"
      units         = var.monthly_budget_amount
    }
  }

  # 予算期間の設定（毎月）
  budget_filter {
    projects = ["projects/${var.gcp_project_id}"]
  }

  # 予算アラートの閾値ルール
  threshold_rules {
    threshold_percent = 0.5  # 50%で最初の通知
    spend_basis       = "CURRENT_SPEND"
  }
  
  threshold_rules {
    threshold_percent = 0.8  # 80%で2回目の通知
    spend_basis       = "CURRENT_SPEND"
  }
  
  threshold_rules {
    threshold_percent = 1.0  # 100%で3回目の通知
    spend_basis       = "CURRENT_SPEND"
  }

  # 通知メールの設定
  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.id
    ]
    
    # 予算通知の頻度設定
    schema_version = "1.0"
  }
}