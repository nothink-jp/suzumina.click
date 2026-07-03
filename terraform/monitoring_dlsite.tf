# DLsite関数専用のモニタリング設定
#
# 注意（SPR-234）: fetchDLsiteUnifiedData は Gen2（Cloud Run 上で実行）のため、実行ログは
# resource.type="cloud_run_revision" + resource.labels.service_name="fetchdlsiteunifieddata"
# （サービス名は小文字）で出力される。Gen1 形式（resource.type="cloud_function" +
# function_name）でフィルタすると一切マッチせず、アラートは発火不能になる。

# ログベースメトリクスを作成してアラートに使用
# per-work の一時エラー（Individual Info API取得エラー / API HTTP Error）は毎日数件出る常態の
# ため除外し、系統障害（作品ID収集エラー・Firestore書き込み失敗等）のみを対象とする。
resource "google_logging_metric" "dlsite_error_count" {
  name    = "dlsite_function_errors"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchdlsiteunifieddata"
    severity >= "ERROR"
    NOT jsonPayload.message:"Individual Info API取得エラー"
    NOT jsonPayload.message:"API HTTP Error for"
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
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_error_count.id}\" resource.type=\"cloud_run_revision\""

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
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchdlsiteunifieddata" AND severity >= "ERROR"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_error_count
  ]
}

# ログベースメトリクス - 作品ID収集の失敗（scrape 失敗 or 0件）
# 旧 filter の「取得した作品数: 0件」は現行コードに存在しないログ文言だった（SPR-234）。
# SPR-232 で scrape 失敗時の asset fallback を撤去し run 中断となったため、
# 「作品ID収集エラー」（scrape 例外）と「収集対象の作品IDが見つかりません」（scrape 成功だが0件）
# の2つが現行の系統的失敗シグナル。恒常化すると works 更新が止まる（次 run=2h後が自動リトライ）。
resource "google_logging_metric" "dlsite_no_data" {
  name    = "dlsite_no_data_fetched"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchdlsiteunifieddata"
    (jsonPayload.message:"作品ID収集エラー" OR jsonPayload.message:"収集対象の作品IDが見つかりません")
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
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_no_data.id}\" resource.type=\"cloud_run_revision\""

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
    # DLsite作品ID収集の失敗（scrape 失敗 or 0件）

    DLsite関数の作品ID収集が失敗（scrape 例外）または0件でした。
    この run は中断され、次の定期実行（2時間後）が自動リトライします（SPR-232 で
    asset fallback を撤去済み）。恒常化すると works の更新が完全に止まります。

    ## 考えられる原因
    1. DLsiteのHTML/AJAX構造が変更された
    2. 検索条件が変更された
    3. アクセス制限（レート制限等）

    ## 対応方法
    1. DLsiteのWebサイトを手動で確認
    2. work-id-collector（AJAX パーサー）のアップデートが必要
    3. ログ確認: jsonPayload.message:"作品ID収集エラー" を Cloud Logging で検索
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
      # Gen1 の cloudfunctions.googleapis.com/function/execution_count は Gen2 では
      # 時系列が生成されない。Gen2 の実行失敗（クラッシュ/タイムアウト）は Cloud Run の
      # request_count 5xx で観測する（web の monitoring.tf と同型・SPR-234）。
      filter = <<-EOT
        resource.type="cloud_run_revision"
        resource.labels.service_name="fetchdlsiteunifieddata"
        metric.type="run.googleapis.com/request_count"
        metric.labels.response_code_class="5xx"
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
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchdlsiteunifieddata"
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
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_schema_drift.id}\" resource.type=\"cloud_run_revision\""

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
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchdlsiteunifieddata" AND jsonPayload.alert="dlsite_schema_drift"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_schema_drift
  ]
}
