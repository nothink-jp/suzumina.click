# checkDataIntegrity（週次の整合性 cron）専用のモニタリング設定（SPR-326）
#
# 以前は専用の監視が無く、日曜 3:00 JST の run が失敗しても気づけなかった。
# 整合性 cron は非正規化の事後修復を担う（CLAUDE.md 軸1）ため、止まると Circle workIds / Creator マッピング /
# Work-Circle の不整合が静かに積み上がる。
#
# 整合性チェックは Cloud Run Jobs で動く（SPR-416。ジョブの定義は job_data_integrity.tf）。ログは
# resource.type="cloud_run_job" + resource.labels.job_name="check-data-integrity" で出る。
# アラートが見るのはジョブだけ。旧 Functions へ戻すときは、付け替えた PR ごと revert する。
#
# 「run が観測されない」型（youtube_run_absent）は使わない: 週 1 回の run に対し、metric absence の
# duration は最大 1 日程度で、週次の欠落を表現できないため。代わりにエラーログと実行の失敗の 2 系統で見る。
# 「スケジューラがジョブを起動できなかった」は、どちらでも拾えない（実行もログも無いため）。SPR-278 で扱う。
# 不整合の検出・修復そのもの（integrity-checks.ts の WARN）は正常動作なので対象外。

# ログベースメトリクス - 整合性チェックの失敗
# エントリポイント（endpoints/data-integrity/check-data-integrity.ts）は失敗時に
# 「データ整合性チェックエラー」を ERROR で出してから rethrow する。
#
# フィルタは、ジョブと旧 Functions の両方のログを拾う（関数は SPR-419 まで残してあるため）。
# ジョブでは、同じ失敗で ERROR は 1 件だけ出る（jobs/run-job.ts の runIntegrityCheckForJob が重ねない）。
# メトリクスのフィルタと、それを見るアラートの resource.type は、別の apply で変える（同じ apply だと 400 で
# 失敗する＝SPR-409）。このメトリクスは #1162 の apply で先に書き換えてある。
resource "google_logging_metric" "data_integrity_error_count" {
  name    = "data_integrity_function_errors"
  project = var.gcp_project_id

  filter = <<-EOT
    ((resource.type="cloud_run_job" AND resource.labels.job_name="check-data-integrity") OR (resource.type="cloud_run_revision" AND resource.labels.service_name="checkdataintegrity"))
    severity >= "ERROR"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "Data Integrity Function Errors"
  }
}

# 表示名は「Job」に揃えてある（見ている対象がジョブなので）。リソース名とメトリクス名（data_integrity_function_*）は
# 変えていない（変えると作り直しになり、メトリクスとアラートを同時に作り直すことになる＝SPR-409）。
resource "google_monitoring_alert_policy" "data_integrity_function_error" {
  display_name = "Data Integrity Job Error Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "整合性チェックでエラーログ検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.data_integrity_error_count.id}\" resource.type=\"cloud_run_job\""

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
    # 整合性チェック（ジョブ check-data-integrity）のエラー

    週次の整合性チェックで ERROR ログが出力されました。この実行は失敗しており、
    Circle workIds / 孤立 Creator マッピング / Work-Circle の事後修復が行われていない可能性があります。
    リトライはしません。次の実行は翌週日曜 3:00 JST なので、必要なら原因を直してから手動で再実行します。

    ## ログ確認コマンド
    ```bash
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="check-data-integrity" AND severity >= "ERROR"' --limit=20 --format=json
    ```

    ## 手動で再実行する
    DLsite の取り込みと重ならない時刻に実行する（SPR-414）。取り込みのジョブは 2 つある:
    毎時（3 分から数分。ブロック中は最長 58 分まで）と、週次フルスイープ（土曜 4:15 から。全件なので長く走る）。
    どちらも走っていないこと（直近の実行に COMPLETION_TIME が入っていること）を確かめてから:
    ```bash
    gcloud run jobs executions list --job fetch-dlsite-unified-data --region asia-northeast1 --limit 1
    gcloud run jobs executions list --job fetch-dlsite-unified-data-full-sweep --region asia-northeast1 --limit 1
    gcloud run jobs execute check-data-integrity --region asia-northeast1
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.data_integrity_error_count
  ]
}

# ジョブの実行の失敗
# タスクの timeout（30 分。正本は job_data_integrity.tf）・OOM・プロセスのクラッシュは、アプリの ERROR ログを
# 出さずに終わるため、上のエラーログでは拾えない。アプリ内の失敗も終了コード 1 になるので、その場合は両方が鳴る。
# リトライはしない（max_retries = 0）ので、1 回の失敗で鳴るのは 1 回。
# Functions のときは Cloud Run の request_count 5xx で見ていた（Jobs には HTTP 応答が無い）。
# リソース名（data_integrity_function_failure）は変えていない（変えると作り直しになる）。
resource "google_monitoring_alert_policy" "data_integrity_function_failure" {
  display_name = "Data Integrity Job Execution Failed"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "整合性チェックのジョブの実行の失敗を検出"

    condition_threshold {
      filter = <<-EOT
        resource.type="cloud_run_job"
        resource.labels.job_name="check-data-integrity"
        metric.type="run.googleapis.com/job/completed_execution_count"
        metric.labels.result="failed"
      EOT

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
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
    # 整合性チェック（ジョブ check-data-integrity）の実行が失敗

    週次の整合性チェックの実行が、失敗で終わりました。
    - 「Data Integrity Job Error Alert」も同時に鳴っていれば、アプリ内の失敗（ERROR ログのあと終了コード 1）
    - こちらだけが鳴っていれば、タスクの timeout（30 分）・OOM・プロセスのクラッシュなど、ERROR ログを出さずに落ちたケース

    ## 確認事項
    1. どの実行が、どれだけ走って失敗したか:
       ```bash
       gcloud run jobs executions list --job check-data-integrity --region asia-northeast1 --limit 5
       gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="check-data-integrity"' --freshness=2h --limit=50 --format="value(timestamp,severity,jsonPayload.message)"
       ```
    2. timeout なら、対象コレクション（works / circles / creators）の件数増加で処理時間が延びていないか
       （Functions のころの実測は 374〜462 秒）。timeout を延ばす前に、全件読みの作りを見直す
    3. 直近のデプロイ・依存更新の有無

    再実行の手順は「Data Integrity Job Error Alert」の runbook を参照。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}
