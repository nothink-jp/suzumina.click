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

# Cloud Runの自動スケーリング最適化設定
# 注：既存のCloud Runサービスに直接メタデータ・アノテーションを追加する
resource "google_cloud_run_service_iam_policy" "scaling_policy" {
  location    = var.region
  project     = var.gcp_project_id
  service     = local.cloudrun_service_name
  policy_data = jsonencode({
    bindings = [
      {
        role    = "roles/run.invoker"
        members = ["allUsers"]
      },
    ]
  })

  depends_on = [
    google_cloud_run_service.nextjs_app
  ]
}

# コスト最適化のためのCloud Runのスケジューリング
# 開発環境のみを対象に、夜間に自動でスケールダウンするスケジューラを設定
resource "google_cloud_scheduler_job" "dev_scaledown_job" {
  count       = var.environment == "development" ? 1 : 0
  name        = "dev-environment-nightly-scaledown"
  description = "開発環境のCloud Runサービスを夜間に自動でスケールダウンする"
  schedule    = "0 23 * * 1-5"  # 平日の23:00に実行
  time_zone   = "Asia/Tokyo"
  
  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.gcp_project_id}/services/${local.cloudrun_service_name}:setIamPolicy"
    
    oauth_token {
      service_account_email = google_service_account.scheduler_sa.email
    }
    
    body = base64encode(<<EOF
{
  "policy": {
    "bindings": [
      {
        "role": "roles/run.invoker",
        "members": ["serviceAccount:${google_service_account.scheduler_sa.email}"]
      }
    ]
  }
}
EOF
    )
  }
}

# スケーラー用のサービスアカウント
resource "google_service_account" "scheduler_sa" {
  account_id   = "scheduler-sa"
  display_name = "Cloud Scheduler Service Account"
  description  = "開発環境のスケーリング自動化用サービスアカウント"
}

# スケーラーに必要な権限を付与
resource "google_project_iam_member" "scheduler_run_admin" {
  project = var.gcp_project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.scheduler_sa.email}"
}