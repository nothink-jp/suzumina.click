# DLsite の取り込み専用のモニタリング設定
#
# **取り込みは Cloud Run Jobs で動く**（SPR-417。ジョブの定義は job_dlsite.tf）。実行ログは
# resource.type="cloud_run_job" + resource.labels.job_name="fetch-dlsite-unified-data"（毎時）/
# "fetch-dlsite-unified-data-full-sweep"（週次フルスイープ）で出る。
#
# ログベースメトリクスのフィルタは、旧 Functions（resource.type="cloud_run_revision" +
# service_name="fetchdlsiteunifieddata"）のログも拾う（local.dlsite_log_source_filter）。
# 関数は SPR-419 まで残してあり、スケジューラを Pub/Sub に戻せば関数へ戻せるため。
# 一方、**アラートが見るのはジョブだけ**（monitoring の alert filter は resource.type を 1 つしか書けない）。
# 関数へ戻すときは、この PR ごと revert する（アラートを関数向けに戻すため）。
#
# メトリクスのフィルタは「書き換え」で、作り直していない（メトリクスとアラートを同時に作り直すと
# apply が 404 で失敗する＝SPR-409）。
locals {
  dlsite_log_source_filter = "((resource.type=\"cloud_run_job\" AND resource.labels.job_name=~\"^fetch-dlsite-unified-data\") OR (resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"fetchdlsiteunifieddata\"))"
}

# ログベースメトリクスを作成してアラートに使用
# per-work の一時エラー（Individual Info API取得エラー / API HTTP Error）は毎日数件出る常態の
# ため除外し、系統障害（作品ID収集エラー・統合データ収集エラー・予期しないエラー等）のみを対象とする。
# API 全面停止（全 work が per-work エラー）は除外の副作用でここから漏れるが、
# バッチ全滅を dlsite_api_batch_all_failed が独立して検知する（役割分担）。
resource "google_logging_metric" "dlsite_error_count" {
  name    = "dlsite_function_errors"
  project = var.gcp_project_id

  # 除外も textPayload/jsonPayload 両張り: 呼び出しから第2引数が外れると message が
  # textPayload へ昇格し、jsonPayload 側だけの NOT では除外が静かに効かなくなるため。
  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    severity >= "ERROR"
    NOT jsonPayload.message:"Individual Info API取得エラー"
    NOT textPayload:"Individual Info API取得エラー"
    NOT jsonPayload.message:"API HTTP Error for"
    NOT textPayload:"API HTTP Error for"
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
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_error_count.id}\" resource.type=\"cloud_run_job\""

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
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND severity >= "ERROR"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_error_count
  ]
}

# ログベースメトリクス - 作品ID収集の系統的失敗（run 中断 or 0件）
# 旧 filter の「取得した作品数: 0件」は現行コードに存在しないログ文言だった（SPR-234）。
# SPR-232 で scrape 失敗時の asset fallback を撤去し run 中断となったため、
# 「run 中断」と「scrape 成功だが0件」の2つが現行の系統的失敗シグナル。
# 恒常化すると works 更新が止まる（次の定期 run が自動リトライ）。
#
# SPR-271: 旧 filter は "作品ID収集エラー" の部分一致で、意味の異なる2つのログを区別できて
# いなかった。per-page の一過性エラー（`作品ID収集エラー (ページ N)`・work-id-collector.ts）は
# 部分結果で処理を継続し run は完走するため、この「収集が失敗した」メトリクスの対象ではない
# （2026-07-24 の DLsite 側 500 で実際に誤発火。2,100件収集・35バッチ完走したのに
# 「作品数0件を検出」が鳴った）。run 中断を表す文言そのものを対象にして両者を分離する。
# per-page エラーは ERROR のまま catch-all の dlsite_error_count 側で拾う（恒常化＝
# カタログ末尾が永久に更新されない silent degradation を隠さないため。軸1）。
resource "google_logging_metric" "dlsite_no_data" {
  name    = "dlsite_no_data_fetched"
  project = var.gcp_project_id

  # 注意: 付加フィールド無しの logger 呼び出しは Cloud Run が message を textPayload へ昇格させる
  # （jsonPayload は残らない）ため、両フィールドを OR で張る（SPR-234）。
  #
  # 2つの OR 節の役割（どちらも run 中断に至る。#857 レビュー指摘の明確化）:
  #   - "収集対象の作品IDが見つかりません" … **実質的な全滅検知はこちら**。
  #     collectAllWorkIds は per-page 例外を内部で捕捉して break するため（再 throw しない）、
  #     1ページ目が落ちると例外ではなく「0件」として返る → prepareNewBatchProcessing の
  #     0件分岐に落ちて run 中断。
  #   - "この run を中断します" … collectWorkIdsForProduction がループ外の予期せぬ例外を
  #     投げた場合の防御的な節。通常運用では到達しないが、握り潰しを避けるため残す。
  #
  # なお「2ページ目で落ちて ~100件しか集まらない」ような重篤な部分失敗はどちらの節にも
  # 該当しない（0件でなく run も完走する）。これは catch-all の dlsite_error_count 側が
  # per-page エラー（severity=error のまま据え置き）で拾う二段構えにしてある。
  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    (
      jsonPayload.message:"この run を中断します" OR textPayload:"この run を中断します"
      OR jsonPayload.message:"収集対象の作品IDが見つかりません" OR textPayload:"収集対象の作品IDが見つかりません"
    )
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite No Data Fetched"
  }
}

# DLsiteデータ取得失敗アラート（run 中断 or 0件）
resource "google_monitoring_alert_policy" "dlsite_no_data_fetched" {
  display_name = "DLsite No Data Fetched Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    # SPR-271: 旧名「作品数0件を検出」は per-page エラーでの誤発火時に実態（2,100件取得済み）と
    # 乖離し、通知を見た人が「全滅した」と誤読する。run が中断された事実を名前で表す。
    display_name = "作品ID収集の失敗でrunが中断"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_no_data.id}\" resource.type=\"cloud_run_job\""

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
    # DLsite作品ID収集の系統的失敗（run 中断 or 0件）

    DLsite関数の作品ID収集が1ページ目から失敗して **run が中断された**、または
    scrape は成功したが0件でした。この run では works が一切更新されず、次の定期実行
    （1時間後）が自動リトライします（SPR-232 で asset fallback を撤去済み）。
    恒常化すると works の更新が完全に止まります。

    ## このアラートが鳴らないケース（SPR-271）
    途中ページの一過性エラー（`作品ID収集エラー (ページ N)`）は対象外です。その場合は
    部分結果で処理を継続し run は完走するため、取りこぼした分は次 run が拾います。
    そちらは catch-all の「DLsite関数でエラーログ検出」側で通知されます。

    ## 考えられる原因
    1. DLsiteのHTML/AJAX構造が変更された
    2. 検索条件が変更された
    3. アクセス制限（レート制限等）

    ## 対応方法
    1. DLsiteのWebサイトを手動で確認
    2. work-id-collector（AJAX パーサー）のアップデートが必要
    3. ログ確認: jsonPayload.message:"この run を中断します" を Cloud Logging で検索
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_no_data
  ]
}

# DLsite のジョブの実行の失敗アラート（OOM・タイムアウト・クラッシュ・アプリが失敗を返した）
# ジョブは終了コードで成否が決まる（apps/functions/src/jobs/run-job.ts の main: 0 成功 / 1 失敗 / 2 モード不正）。
# レート制限で待つ時間が残らずに終えた run は成功（0）で、ここには数えない（平常＝SPR-358）。
# アプリが catch したエラー（終了コード 1）は dlsite_error_count 側でも検知する。この alert でしか分からないのは、
# プロセスがログを出せずに落ちたケース（OOM・タスク timeout の 58 分・イメージが起動しない）。
# Functions のときは Cloud Run の request_count 5xx で見ていた（SPR-234）。Jobs には HTTP 応答が無い。
# リソース名（dlsite_function_failure）は変えていない（変えると作り直しになる）。
resource "google_monitoring_alert_policy" "dlsite_function_failure" {
  display_name = "DLsite Job Execution Failed"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "ジョブの実行の失敗を検出"

    condition_threshold {
      # 毎時と週次フルスイープの両方を見る（job_name の前方一致）。
      filter = <<-EOT
        resource.type="cloud_run_job"
        resource.labels.job_name=monitoring.regex.full_match("fetch-dlsite-unified-data.*")
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
    # DLsite のジョブの実行が失敗

    fetch-dlsite-unified-data（毎時）か fetch-dlsite-unified-data-full-sweep（週次）の実行が、失敗で終わりました。
    リトライはしません（max_retries = 0）。続きは、次の毎時の実行が継続カーソルから取ります。
    1 回だけなら、次の実行が成功していれば対応不要です。

    ## 確認事項
    1. どの実行が、なぜ失敗したか:
       ```bash
       gcloud run jobs executions list --job fetch-dlsite-unified-data --region asia-northeast1 --limit 5
       gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND severity>=WARNING' --freshness=2h --limit=30 --format=json
       ```
    2. ログに ERROR が無いまま失敗している → プロセスが落ちている。メモリ（512Mi）・タスク timeout（58 分）・
       イメージの起動（直近の Deploy Functions）を確認
    3. 「統合データ収集エラー」がある → アプリが失敗を返した。DLsite Function Error Alert も鳴っているはず
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}

# ログベースメトリクス - バッチ全滅（Individual Info API 全面停止の兆候）
# per-work の一時エラーは dlsite_error_count から除外しているため、「全 work が取得失敗する
# 全面停止」はこのメトリクスが検知の正本（役割分担・SPR-234）。バッチ内 50件全てが失敗すると
# processBatch が「バッチ N: APIレスポンスなし」を WARN 出力する（endpoints/dlsite/process-batch.ts）。
# 平常時は発生しない（過去30日で0件・2026-07-04 実測）ため閾値は >0 でノイズにならない。
resource "google_logging_metric" "dlsite_api_batch_all_failed" {
  name    = "dlsite_api_batch_all_failed"
  project = var.gcp_project_id

  # 「バッチ N: APIレスポンスなし」は付加フィールド無しの warn のため textPayload に出る
  # （jsonPayload.message には残らない）。将来の引数追加にも耐えるよう両フィールドを張る（SPR-234）。
  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    (jsonPayload.message:"APIレスポンスなし" OR textPayload:"APIレスポンスなし")
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite API Batch All Failed"
  }
}

# DLsite API バッチ全滅アラート
resource "google_monitoring_alert_policy" "dlsite_api_batch_all_failed" {
  display_name = "DLsite API Batch All Failed Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "バッチ内全件のAPI取得失敗を検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_api_batch_all_failed.id}\" resource.type=\"cloud_run_job\""

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
    # DLsite Individual Info API バッチ全滅

    1バッチ（50件）の Individual Info API 取得が全件失敗しました。平常時は発生しない
    シグナルで、API の全面停止・アクセスブロック・ネットワーク障害の兆候です
    （個別作品の一時エラーは常態のためアラート対象外。全滅のみここで検知）。

    ## 確認事項
    1. DLsite の稼働状況を手動確認（Webサイト・Individual Info API）
    2. レート制限・IPブロックの可能性（Cloud Run の egress IP からのアクセス可否）
    3. ログ確認: jsonPayload.message:"APIレスポンスなし" を Cloud Logging で検索

    ## 補足
    連続する場合も works の既存データは保持され、価格履歴のみ当日分が欠落する。
    復旧後の run で自動的に再開する（手動介入は原則不要）。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_api_batch_all_failed
  ]
}

# ログベースメトリクス - 定期 run の開始（無音障害検知用ハートビート）
# Scheduler 停止 / ジョブの消失・起動不能 / スケジューラの権限の破壊では
# 「ログが出ない」ため、ログ内容ベースのアラートは全て沈黙する（SPR-234 分類 B1）。
# run 開始ログ（1h 毎・3時台を除く23回/日＝スケジュールの正本は
# function_dlsite_individual_info_api.tf）を metric 化し、absence 条件で run 途絶そのものを検知する。
# 「実行中」の印で飛ばされた実行は、開始ログを出さない（＝数えない。fetch-dlsite-unified-data.ts）。
#
# 注意（2026-07-04/07-05 実測の偽陽性・原因確定）: デプロイ後に本アラートが誤発火する
# 事象が2回発生したが、実行ログ自体は1件も欠けていなかった（gcloud logging read で確認済み）。
# 真因は「metric反映遅延」ではなく、revision 単位で時系列が分かれる構造的な問題
# （dlsite_run_absent policy の cross_series_reducer 集約で解消・詳細は同 policy 側コメント）。
resource "google_logging_metric" "dlsite_run_started" {
  name    = "dlsite_run_started"
  project = var.gcp_project_id

  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    (jsonPayload.message:"統合データ収集開始" OR textPayload:"統合データ収集開始")
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite Run Started"
  }
}

# DLsite 定期 run 途絶アラート（dead man's switch）
resource "google_monitoring_alert_policy" "dlsite_run_absent" {
  display_name = "DLsite Run Absent Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "定期runが3時間以上観測されない"

    # 1h 周期 + 2h マージン（SPR-412 で 2h 周期 → 1h 周期。旧 duration は 4h）。
    # 1 run 欠けただけでは発火せず（間隔 2h）、2 run 連続欠け（間隔 3h）から異常とみなす。
    # 3時台は run が無く 2:03 → 4:03 が平常で 2h 空くため、duration を 2h 以下にはできない。
    # その前後（2:03 か 4:03）だけは 1 run 欠けで間隔が 3h になり発火しうる。
    #
    # 注意: 不在の検知は、この時系列が 1 回でも生まれたあとでないと働かない。スケジューラがジョブを最初から
    # 起動できていない場合（権限の誤りなど）、このアラートは鳴らずに沈黙する。スケジューラやジョブの定義を
    # 変えた直後は、次の毎時 3 分の実行をログで直接確かめる（runbook のコマンド）。
    #
    # 見るのは毎時のジョブだけ（job_name で絞る）。週次フルスイープのジョブは週 1 回しか走らないので、
    # 絞らないと、その系列が 3 時間で「不在」になって誤発火する。
    # ジョブの時系列は job_name ごとに 1 本（Functions のときは revision ごとに分かれ、デプロイのたびに
    # 誤発火していた＝2026-07-05）。reducer は、系列の分かれ方が変わっても 1 本に保つために残している。
    condition_absent {
      filter   = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_run_started.id}\" resource.type=\"cloud_run_job\" resource.labels.job_name=\"fetch-dlsite-unified-data\""
      duration = "10800s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_COUNT"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.job_name"]
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
    # DLsite 定期 run の途絶（3時間以上）

    ジョブ fetch-dlsite-unified-data の run 開始ログが3時間以上観測されていません（正常時は
    1時間毎・3時台を除く23回/日）。ログ自体が出ない障害のため、他の DLsite アラートは沈黙します。

    ## まず確認すること
    実際に run が欠けているかを最優先で確認する：
    ```bash
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="fetch-dlsite-unified-data" AND jsonPayload.message:"統合データ収集開始"' --freshness=1d --format="value(timestamp)" --order=asc
    ```
    直近の毎時3分（3:03 は元から無い）が全て埋まっていれば偽陽性（対応不要）。
    3時台を飛ばす都合で、2:03 か 4:03 の run が1回欠けただけでも間隔が3時間になり、このアラートは
    鳴りうる（他の時刻は2回連続で欠けてから鳴る）。その場合は次の run が来ていれば対応不要。

    「別の実行が進行中のため統合データ収集をスキップ」が続いている場合は、「実行中」の印が残っている
    （落ちた実行の印は 58 分で無効になる。続くなら、同じジョブが重なって起動され続けている）。

    ## 実際に欠けていた場合の原因と確認手順
    1. Cloud Scheduler 停止/削除・起動の失敗: gcloud scheduler jobs describe fetch-dlsite-individual-api-hourly --location=asia-northeast1
       （status.code が 0 以外なら、スケジューラがジョブを起動できていない。権限＝run.invoker を確認）
    2. ジョブの消失/起動不能: gcloud run jobs describe fetch-dlsite-unified-data --region=asia-northeast1
    3. 実行が始まっているのにログが無い: gcloud run jobs executions list --job fetch-dlsite-unified-data --region asia-northeast1 --limit 5
    4. 直近のデプロイ・terraform apply の有無を確認

    ## 復旧確認
    手動で 1 回流す: gcloud run jobs execute fetch-dlsite-unified-data --region=asia-northeast1
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_run_started
  ]
}

# ログベースメトリクス - API 取得失敗率の上昇（部分劣化）
# バッチ取得で失敗が 10% を超えるとクライアントが集約 WARN「API取得失敗が多数」を出す
# （individual-info-api-client.ts）。per-work 一時エラー（常態・除外済み）と「全滅」
# （dlsite_api_batch_all_failed）の中間帯＝部分劣化を検知する（SPR-234 分類 B2）。
# 頻度実績は月1〜3回（2026-08 実測で 12%/20%/22%）＝低ノイズ。
# ただし SPR-318 まで、実際の発火要因は DLsite 側ではなく自前の実行時間超過だった
# （run が関数 timeout を超えて走り、リクエスト外＝CPU スロットリング下で API 取得が
# 15 秒タイムアウトする）。観測した4回とも timeout 到達後に発生している。
# timeout 540s + MAX_EXECUTION_TIME 480s（run 起動時点基準）で解消済みのため、
# 以後の発火は DLsite 側の劣化として読んでよい（再発時はまず run の latency を見る）。
# 単一文字列 warn のため textPayload に出る点に注意（両フィールド張り）。
resource "google_logging_metric" "dlsite_api_failure_rate_high" {
  name    = "dlsite_api_failure_rate_high"
  project = var.gcp_project_id

  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    (jsonPayload.message:"API取得失敗が多数" OR textPayload:"API取得失敗が多数")
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite API Failure Rate High"
  }
}

# DLsite API 部分劣化アラート（失敗率 >10%）
resource "google_monitoring_alert_policy" "dlsite_api_failure_rate_high" {
  display_name = "DLsite API High Failure Rate Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "バッチ取得の失敗率10%超を検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_api_failure_rate_high.id}\" resource.type=\"cloud_run_job\""

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
    # DLsite API 取得失敗率の上昇（部分劣化）

    バッチ取得の失敗率が 10% を超えました（実績: 月1〜3回・12〜22%）。単発は自己回復する
    ことが多いですが、短時間に連続する場合は全面停止（DLsite API Batch All Failed）へ
    進行する可能性があるため要調査です。

    ## まず確認すること
    どの run の、どのバッチで出たか:
    ```bash
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND jsonPayload.message:"API取得失敗が多数"' --freshness=1d --limit=20 --format="value(timestamp,jsonPayload.message)"
    ```
    Functions で動いていたころ（2026-08 まで）の発火は、すべて自前の実行時間超過が原因だった（SPR-318:
    関数の timeout を超えると CPU が絞られ、API 呼び出しが 15 秒のタイムアウトに掛かる）。
    ジョブは実行中ずっと CPU が割り当てられるので、この原因は当てはまらない。

    ## DLsite 側を疑う場合の確認事項
    1. ログ確認: "API取得失敗が多数" / "Individual Info API サーバーエラー" を Cloud Logging で検索
       （エラー内訳が timeout ばかりなら上記の実行時間超過、HTTP 4xx/5xx なら DLsite 側）
    2. DLsite の稼働状況を手動確認
    3. 失敗した作品は **そのサイクル内では再試行されない**（取得失敗の有無に関わらずバッチは
       完了扱いになるため、次 run はサイクルの続き＝次バッチから始まる）。次サイクルの開始時に
       due として拾われる＝通常は次の run（1時間後）、サイクルが2 runにまたがった場合はその次の run。
       手動介入は原則不要。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_api_failure_rate_high
  ]
}

# ログベースメトリクス - レート制限による run 中断（SPR-408）
# Individual Info API が 429 を返すと、クライアントはリトライせずにその run の残りを打ち切り、
# オーケストレータが jsonPayload.alert="dlsite_rate_limited" 付きの WARN を出す
# （endpoints/dlsite/run-unified-data-collection.ts）。打ち切った分は次の run が同じバッチから
# やり直すので取りこぼしにはならないが、サイクルが複数 run に延びる＝鮮度が落ちる。
# 打ち切り時は「API取得失敗が多数」「APIレスポンスなし」を出さないため、429 の検知はこの
# メトリクスが正本（dlsite_api_failure_rate_high / dlsite_api_batch_all_failed では拾えない）。
resource "google_logging_metric" "dlsite_rate_limited" {
  name    = "dlsite_rate_limited"
  project = var.gcp_project_id

  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    jsonPayload.alert="dlsite_rate_limited"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite Rate Limited"
  }
}

# DLsite レート制限アラート（429 で run を中断）
resource "google_monitoring_alert_policy" "dlsite_rate_limited" {
  display_name = "DLsite Rate Limited Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "レート制限（429）による run 中断を検出"

    condition_threshold {
      # **このアラートだけは Functions（cloud_run_revision）を見たままにしている。** ジョブは、レート制限を
      # 受けても待って続けるので、alert="dlsite_rate_limited" を出さない（平常＝SPR-417）。つまり、取り込みが
      # ジョブで動いているあいだ、このアラートは鳴らない。関数へ戻したときだけ意味を持つ。
      # ジョブ向けには、「取得が進んでいない」アラート（dlsite_fetch_stalled・下）がある。
      # このアラートとメトリクスは、旧 Functions を撤去するとき（SPR-419）に一緒に撤去する。
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_rate_limited.id}\" resource.type=\"cloud_run_revision\""

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
    # DLsite Individual Info API レート制限（429）

    Individual Info API が 429 を返したため、run の残りを打ち切りました。打ち切った分は
    次の run が同じバッチからやり直します（取りこぼしにはならない）。手動介入は原則不要ですが、
    毎 run 発火する場合はサイクルが完走できていないので要対応です。

    ## 確認事項
    1. どのバッチで止まったか・Retry-After の値:
       ```bash
       gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchdlsiteunifieddata" AND jsonPayload.alert="dlsite_rate_limited"' --limit=20 --format=json
       ```
    2. 429 の応答ヘッダ（制限の窓の手掛かり。jsonPayload.rateLimitHeaders）:
       ```bash
       gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchdlsiteunifieddata" AND jsonPayload.rateLimitHeaders:*' --limit=20 --format=json
       ```
    3. 毎 run 同じ位置で止まる場合はリクエストペースが閾値を超えている。
       MAX_CONCURRENT_API_REQUESTS / API_REQUEST_DELAY（endpoints/dlsite/process-batch.ts）を下げる。
       **同じ batchNumber で連続して発火している場合はサイクルが止まっている**。cursor はバッチ単位
       （50件）でしか進まないため、1回の制限の窓で通る件数が 50 件未満だと同じバッチを毎 run
       取り直して先へ進めない。その間は作品ID の再収集（新作の検知）も走らない。
    4. 1件目から 429 になる場合は制限が掛かったままか、アクセス自体がブロックされている。
       DLsite の稼働状況と、他の経路（AJAX の作品ID収集）が通っているかを確認する。

    ## 背景（SPR-408）
    2026-11-13 に、約10リクエスト/秒のペースで約100件を取得した時点から 429 になり始めた。
    一度制限に入ると約5分続く。閾値は未確定。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_rate_limited
  ]
}

# ログベースメトリクス - 取得の進捗（SPR-417）
# 1 回の run の終わりに出る「DLsite run の集計」のうち、1 件以上取得できた run を数える
# （endpoints/dlsite/run-unified-data-collection.ts の worksFetched＝API から取得できた件数）。
# apiCalls（試した件数）で絞らないのは、全件が失敗した run でも 0 より大きくなるため。worksUpdated（差分が
# あった件数）で絞らないのは、平常でも 0 になりうるため。
# ジョブはレート制限を待って続けるので、「ブロックされた」こと自体は異常ではない。異常なのは
# 「何時間も 1 件も取れていない」ことで、それはこのメトリクスの不在で分かる。
# アラートは下の dlsite_fetch_stalled（メトリクスの次の apply で足した。同じ apply で足すと 404 で失敗する＝SPR-409）。
resource "google_logging_metric" "dlsite_fetch_progress" {
  name    = "dlsite_fetch_progress"
  project = var.gcp_project_id

  filter = <<-EOT
    ${local.dlsite_log_source_filter}
    jsonPayload.message="DLsite run の集計"
    jsonPayload.worksFetched>0
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "DLsite Fetch Progress"
  }
}

# DLsite の取得が進んでいないアラート（SPR-417）
# 「DLsite Rate Limited」（ブロックのたびに鳴る）の置き換え。ジョブはブロックを待って続けるので、鳴らすのは
# 「6 時間、1 件も取得できた run が無い」とき。
resource "google_monitoring_alert_policy" "dlsite_fetch_stalled" {
  display_name = "DLsite Fetch Stalled Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "6時間以上、1件も取得できていない"

    # 6 時間の根拠: 平常は毎時の実行が必ず取得する（volatile の約 280 件は毎サイクル取得対象になる）。
    # ブロックが続いているときも、開いている時間（2026-11-16〜18 の実測で 33 分のうち約 3 分）に当たれば
    # 1 回の実行で取得できる。3 時台は実行が無いので、2 時間の空きは平常。そこに 4 時間の余裕を足した。
    # 実測がたまったら短くする（SPR-418）。
    #
    # 毎時と週次フルスイープのどちらのジョブが取得しても「進んでいる」と数える（job_name で絞らず、1 系列に集約）。
    # 不在の検知は、この時系列が 1 回でも生まれたあとでないと働かない（dlsite_run_absent と同じ注意）。
    condition_absent {
      filter   = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_fetch_progress.id}\" resource.type=\"cloud_run_job\""
      duration = "21600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_COUNT"
        cross_series_reducer = "REDUCE_SUM"
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
    # DLsite の取得が 6 時間進んでいない

    DLsite の取り込みのジョブで、1 件以上取得できた実行が 6 時間ありません。作品の価格・セール・新作が
    更新されていません。

    ## まず確認すること
    実行は始まっているか、どこで止まっているか（直近の集計ログ）:
    ```bash
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND jsonPayload.message="DLsite run の集計"' --freshness=8h --format="table(timestamp,jsonPayload.worksFetched,jsonPayload.apiCalls,jsonPayload.stopReason,jsonPayload.rateLimitWaits,jsonPayload.rateLimitWaitSeconds)"
    ```

    ## 読み方
    - 集計ログが無い → 実行が始まっていないか、集計の前に落ちている。DLsite Run Absent Alert /
      DLsite Job Execution Failed を見る
    - `stopReason=rate_limit`・`rateLimitWaits` が大きい・`worksFetched=0` → DLsite（Cloudflare）にブロックされ続けている。
      応答ヘッダを確認する:
      ```bash
      gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND jsonPayload.rateLimitHeaders:*' --freshness=8h --limit=10 --format=json
      ```
      Retry-After が 30 分を大きく超えている、または開いている時間が無くなっている場合は、待っても取れない。
      経緯と、試して効かなかった対処（固定 IP・ヘッダ）は SPR-423。ブラウザを装って判定を避ける方向は採らない
    - `apiCalls` は大きいのに `worksFetched=0` → API は応答しているが全件が失敗している。
      DLsite API Batch All Failed Alert / DLsite API High Failure Rate Alert を見る

    ## 費用の注意
    ブロックが続くと、ジョブは待ち時間のぶんだけ長く走る（最長 55 分 × 23 回/日。終日続くと 月 約 $38）。
    長引くなら、スケジューラを一時停止するか、待たない設定に戻すことを検討する:
    gcloud scheduler jobs pause fetch-dlsite-individual-api-hourly --location=asia-northeast1
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_fetch_progress
  ]
}

# ログベースメトリクス - スキーマドリフト（SPR-140 / SPR-144）
# 本番フェッチ経路で、既知フィールド集合に無い新フィールドが出現すると
# logger.warn が jsonPayload.alert="dlsite_schema_drift" 付きで出力される。
resource "google_logging_metric" "dlsite_schema_drift" {
  name    = "dlsite_schema_drift"
  project = var.gcp_project_id

  filter = <<-EOT
    ${local.dlsite_log_source_filter}
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
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.dlsite_schema_drift.id}\" resource.type=\"cloud_run_job\""

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
    gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name=~"^fetch-dlsite-unified-data" AND jsonPayload.alert="dlsite_schema_drift"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.dlsite_schema_drift
  ]
}
