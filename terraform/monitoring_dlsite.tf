# DLsite関数専用のモニタリング設定

# ログベースメトリクスを作成してアラートに使用
resource "google_logging_metric" "dlsite_error_count" {
  name    = "dlsite_function_errors"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_function"
    resource.labels.function_name="fetchDLsiteUnifiedData"
    severity >= "ERROR"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite Function Errors"
  }
}

# DLsite関数エラーアラート（ログベースメトリクス使用）
resource "google_monitoring_alert_policy" "dlsite_function_error" {
  display_name = "DLsite Function Error Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "DLsite関数でエラーログ検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_error_count.id}\" resource.type=\"cloud_function\""

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # DLsite Individual Info API データ取得エラー
    
    DLsite Individual Info APIからのデータ取得でエラーが発生しました。
    API接続の失敗またはAPIレート制限の可能性があります。
    
    ## 確認事項
    1. Cloud Loggingでエラー詳細を確認
    2. DLsite APIのステータスを確認
    3. APIレート制限の状況を確認
    
    ## ログ確認コマンド
    ```bash
    gcloud logging read 'resource.type="cloud_function" AND resource.labels.function_name="fetchDLsiteUnifiedData" AND severity >= "ERROR"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_error_count
  ]
}

# ログベースメトリクス - 0件取得
resource "google_logging_metric" "dlsite_no_data" {
  name    = "dlsite_no_data_fetched"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_function"
    resource.labels.function_name="fetchDLsiteUnifiedData"
    jsonPayload.message:"取得した作品数: 0件"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite No Data Fetched"
  }
}

# DLsiteデータ取得失敗アラート（0件取得）
resource "google_monitoring_alert_policy" "dlsite_no_data_fetched" {
  display_name = "DLsite No Data Fetched Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "作品数0件を検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_no_data.id}\" resource.type=\"cloud_function\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # DLsiteデータ取得0件
    
    DLsite関数が実行されましたが、作品データが1件も取得できませんでした。
    
    ## 考えられる原因
    1. DLsiteのHTML構造が変更された
    2. 検索条件が変更された
    3. アクセス制限（レート制限等）
    
    ## 対応方法
    1. DLsiteのWebサイトを手動で確認
    2. パーサーのアップデートが必要
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_no_data
  ]
}

# DLsite関数の実行失敗アラート
resource "google_monitoring_alert_policy" "dlsite_function_failure" {
  display_name = "DLsite Function Execution Failure"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "関数実行の失敗"

    condition_threshold {
      filter = <<-EOT
        resource.type="cloud_function"
        resource.labels.function_name="fetchDLsiteUnifiedData"
        metric.type="cloudfunctions.googleapis.com/function/execution_count"
        metric.labels.status!="ok"
      EOT

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # DLsite関数の実行失敗
    
    fetchDLsiteUnifiedData関数の実行が失敗しました。
    
    ## 確認事項
    1. Cloud Functions のエラーログを確認
    2. Individual Info API の応答確認
    3. メモリ不足やタイムアウトの可能性
    4. 権限エラーの確認
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}
# ログベースメトリクス - スキーマドリフト（SPR-140 / SPR-144）
# 本番フェッチ経路で、既知フィールド集合に無い新フィールドが出現すると
# logger.warn が jsonPayload.alert="dlsite_schema_drift" 付きで出力される。
resource "google_logging_metric" "dlsite_schema_drift" {
  name    = "dlsite_schema_drift"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_function"
    resource.labels.function_name="fetchDLsiteUnifiedData"
    jsonPayload.alert="dlsite_schema_drift"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite Schema Drift Detected"
  }
}

# DLsite スキーマドリフトアラート（新フィールド出現）
resource "google_monitoring_alert_policy" "dlsite_schema_drift" {
  display_name = "DLsite Schema Drift Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "既知集合に無い新フィールドを検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_schema_drift.id}\" resource.type=\"cloud_function\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # DLsite API スキーマドリフト検出（新フィールド）

    DLsite Individual Info API のレスポンスに、既知フィールド集合（ベースライン）に
    無いトップレベルフィールドが出現しました（取得可能データの増加など）。

    ## 対応方法
    1. Cloud Logging で jsonPayload.alert="dlsite_schema_drift" の WARN を確認し、
       jsonPayload.newFields で新フィールド名を把握する。
    2. 必要なら shared-types の DLsiteApiResponse スキーマにフィールドを追加する。
    3. ベースラインを再生成して更新する:
       pnpm --filter @suzumina.click/functions tools:capture -- --limit 150
       → apps/functions/src/services/dlsite/dlsite-known-api-fields.ts を更新（SPR-140）。

    ## ログ確認コマンド
    ```bash
    gcloud logging read 'resource.type="cloud_function" AND resource.labels.function_name="fetchDLsiteUnifiedData" AND jsonPayload.alert="dlsite_schema_drift"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_schema_drift
  ]
}
