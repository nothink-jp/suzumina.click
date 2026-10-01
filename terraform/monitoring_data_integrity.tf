# checkDataIntegrity（週次の整合性 cron）専用のモニタリング設定（SPR-326）
#
# 以前は専用の監視が無く、日曜 3:00 JST の run が失敗しても気づけなかった。
# 整合性 cron は非正規化の事後修復を担う（CLAUDE.md 軸1）ため、止まると Circle workIds / Creator マッピング /
# Work-Circle の不整合が静かに積み上がる。
#
# 注意（SPR-234）: Gen2 のためログは resource.type="cloud_run_revision" +
# resource.labels.service_name="checkdataintegrity"（サービス名は小文字）で出る。
#
# 「run が観測されない」型（youtube_run_absent）は使わない: 週 1 回の run に対し、metric absence の
# duration は最大 1 日程度で、週次の欠落を表現できないため。代わりにエラーログと 5xx の 2 系統で見る。
# 不整合の検出・修復そのもの（integrity-checks.ts の WARN）は正常動作なので対象外。

# ログベースメトリクス - 整合性チェックの失敗
# エントリポイント（endpoints/data-integrity/check-data-integrity.ts）は失敗時に
# 「データ整合性チェックエラー」を ERROR で出してから rethrow する。
resource "google_logging_metric" "data_integrity_error_count" {
  name    = "data_integrity_function_errors"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="checkdataintegrity"
    severity >= "ERROR"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "Data Integrity Function Errors"
  }
}

resource "google_monitoring_alert_policy" "data_integrity_function_error" {
  display_name = "Data Integrity Function Error Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "整合性チェックでエラーログ検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.data_integrity_error_count.id}\" resource.type=\"cloud_run_revision\""

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
    # 整合性チェック（checkDataIntegrity）のエラー

    週次の整合性 cron で ERROR ログが出力されました。この run は失敗しており、
    Circle workIds / 孤立 Creator マッピング / Work-Circle の事後修復が行われていない可能性があります。
    次の run は翌週日曜 3:00 JST なので、必要なら原因を直してから Pub/Sub トピック
    `data-integrity-check-trigger` に publish して手動で再実行します。

    ## ログ確認コマンド
    ```bash
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="checkdataintegrity" AND severity >= "ERROR"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.data_integrity_error_count
  ]
}

# プラットフォーム障害（5xx）
# タイムアウト（540s。正本は deploy-functions.yml）やプロセスのクラッシュはアプリの ERROR ログを
# 出さずに終わるため、上のエラーログでは拾えない。アプリ内の失敗も rethrow で 5xx になるので、
# その場合は両方が同時に鳴る（--retry 無しで deploy しているため再試行による連発は無い）。
resource "google_monitoring_alert_policy" "data_integrity_function_failure" {
  display_name = "Data Integrity Function Platform Failure (5xx)"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "整合性チェックの 5xx を検出"

    condition_threshold {
      filter = <<-EOT
        resource.type="cloud_run_revision"
        resource.labels.service_name="checkdataintegrity"
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
    # 整合性チェック（checkDataIntegrity）のプラットフォーム障害（5xx）

    週次の整合性 cron が 5xx で終了しました。
    - 「Data Integrity Function Error Alert」も同時に鳴っていれば、アプリ内の失敗（ERROR ログ後の rethrow）
    - こちらだけが鳴っていれば、タイムアウト（540s）やプロセスのクラッシュなど、ERROR ログを出さずに落ちたケース

    ## 確認事項
    1. Cloud Run のログ（service_name="checkdataintegrity"）で該当時刻の実行と所要時間を確認
    2. タイムアウトなら、対象コレクション（works / circles / creators）の件数増加で処理時間が延びていないか
    3. 直近のデプロイ・依存更新の有無
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}
