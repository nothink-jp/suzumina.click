# YouTube関数専用のモニタリング設定（SPR-235・SPR-234 のDLsite監視を横展開）
#
# 注意（SPR-234 で確立した前提を踏襲）:
#   - fetchYouTubeVideos は Gen2（Cloud Run 上で実行）のため、実行ログは
#     resource.type="cloud_run_revision" + resource.labels.service_name="fetchyoutubevideos"
#     （サービス名は小文字）で出力される。Gen1 形式（resource.type="cloud_function"）は一切マッチしない
#   - 付加フィールド無しの logger 呼び出しは message が textPayload へ昇格するため、
#     filter は jsonPayload.message / textPayload の両張りにする
#
# 実行構成（2026-07-25 実測）: 同一関数が3系統のスケジューラで起動する
#   - hourly（通常run・毎時30分）              24 run/日
#   - fast_recheck（15分毎・SPR-266）          96 run/日
#   - weekly_full_sweep（日曜4:00 JST）        1 run/週
#   合計 120 リクエスト/日・すべて 2xx（30日実測）
#
# ログ実態（直近30日・2026-07-25 集計）: severity>=WARNING は 4件のみ
#   3件 discovery差分（週次フルスイープの度に出る常態・SPR-235でログを分離）
#   1件 Memory limit exceeded（プラットフォーム発ERROR）
# DLsite と違い per-item の常態ノイズが無いため、系統エラーは NOT 除外なしで張れる。

# ログベースメトリクス - 系統エラー（catch-all）
# 除外を一切置かない。30日で1件（OOM）のみ＝ノイズにならないことを実測で確認済み。
# ここが拾う主なもの:
#   - YouTube API 403（クォータ超過の本命シグナル）→「YouTube API 呼び出しエラー」
#   - Entity変換失敗 / バッチ保存エラー / メタデータ取得失敗
#   - プラットフォーム発の "Memory limit of N MiB exceeded"（jsonPayload を持たず
#     textPayload にのみ出る。両張りが必要な実例）
resource "google_logging_metric" "youtube_error_count" {
  name    = "youtube_function_errors"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchyoutubevideos"
    severity >= "ERROR"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "YouTube Function Errors"
  }
}

resource "google_monitoring_alert_policy" "youtube_function_error" {
  display_name = "YouTube Function Error Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "YouTube関数でエラーログ検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.youtube_error_count.id}\" resource.type=\"cloud_run_revision\""

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
    # YouTube関数のエラーログ検出

    fetchYouTubeVideos で ERROR ログが出力されました。平常時は月1件程度のため、
    発火したら実ログの確認が必要です。

    ## 主な原因の切り分け
    1. **YouTube API クォータ超過**: `YouTube API 呼び出しエラー` に 403 quotaExceeded が
       含まれていないか。超過すると当日いっぱい動画更新が止まる（翌 0:00 PT にリセット）
    2. **メモリ上限**: `Memory limit of N MiB exceeded` はプラットフォームによる
       インスタンス強制終了。リクエスト自体は 2xx で完了するため 5xx アラートでは拾えない
       （SPR-235 で 512Mi へ引き上げ済み。再発時は蓄積源の調査が必要）
    3. **保存系**: `動画のEntity変換に失敗` / `バッチ保存エラー` は Firestore 書き込み側

    ## ログ確認コマンド
    ```bash
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchyoutubevideos" AND severity >= "ERROR"' --limit=20 --format=json
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.youtube_error_count
  ]
}

# ログベースメトリクス - 通常runの開始（無音障害検知用ハートビート）
#
# キーに使う「…の動画情報取得を開始します」は **通常run（mode=normal）でのみ**、かつ
# 二重実行ロックのゲート（prepareExecution）を通過した後に出力される。この位置が重要で:
#   - fast_recheck（96 run/日）では出ないため、hourly が止まったまま fast_recheck だけが
#     生き残っている状態（＝統計ティア更新の停止）を隠さない
#   - ロック競合スキップ（`前回の実行が完了していません`）が恒常化した場合もこのログは
#     出ないため、cursor 詰まり相当の無音劣化を同じアラートで検知できる
#     （SPR-235 の「lock 競合の対象化検討」は実測0件＋この性質により専用metricを作らない判断）
resource "google_logging_metric" "youtube_run_started" {
  name    = "youtube_run_started"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchyoutubevideos"
    (jsonPayload.message:"の動画情報取得を開始します" OR textPayload:"の動画情報取得を開始します")
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "YouTube Run Started"
  }
}

resource "google_monitoring_alert_policy" "youtube_run_absent" {
  display_name = "YouTube Run Absent Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "通常runが3時間以上観測されない"

    # 毎時実行に対し 3h（=3 run 欠け）で発火。1 run の一時的な欠けでは鳴らない。
    #
    # cross_series_reducer は必須（SPR-234 の偽陽性の真因）。Cloud Run の監視対象リソース
    # ラベルには revision_name が含まれるため、集約しないと metric の時系列が revision ごとに
    # 分かれ、デプロイで旧 revision の系列が更新停止 → duration 後に必ず誤発火する。
    condition_absent {
      filter   = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.youtube_run_started.id}\" resource.type=\"cloud_run_revision\""
      duration = "10800s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_COUNT"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
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
    # YouTube 通常runの途絶（3時間以上）

    fetchYouTubeVideos の通常run開始ログが3時間以上観測されていません（正常時は毎時30分・
    24回/日）。ログ自体が出ない障害のため、他の YouTube アラートは沈黙します。
    動画の新着追加・統計（再生数等）の更新が止まっている状態です。

    ## まず確認すること
    実際に run が欠けているかを最優先で確認する:
    ```bash
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fetchyoutubevideos" AND (jsonPayload.message:"の動画情報取得を開始します" OR textPayload:"の動画情報取得を開始します")' --freshness=1d --format="value(timestamp)" --order=asc
    ```
    毎時の時刻が埋まっていれば偽陽性（対応不要）。

    ## 実際に欠けていた場合の原因
    1. **二重実行ロックの詰まり**: `前回の実行が完了していません` が出続けていないか。
       このログが出ている場合はロック解放漏れ（Firestore の fetchMetadata.isInProgress）
    2. Cloud Scheduler 停止/削除: gcloud scheduler jobs describe fetch-youtube-videos-hourly --location=asia-northeast1
    3. Pub/Sub topic・Eventarc trigger の破壊: gcloud eventarc triggers list --location=asia-northeast1
    4. サービス消失/起動不能: gcloud run services describe fetchyoutubevideos --region=asia-northeast1

    ## 復旧確認
    手動トリガで1 run 流す: gcloud scheduler jobs run fetch-youtube-videos-hourly --location=asia-northeast1
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.youtube_run_started
  ]
}

# YouTube関数のプラットフォーム障害アラート（5xx）
#
# エントリポイント（endpoints/youtube/fetch-youtube-videos.ts）は catch-all で例外を
# ERROR ログ化して正常終了するため、アプリレベルの失敗は 5xx にならない（youtube_error_count が拾う）。
# 加えて **OOM も 5xx にならない**点に注意: 2026-07-23 の Memory limit 事象では、
# インスタンスが強制終了されたのは run 完了の約2分後（アイドル中）で、当日のリクエストは
# 120件すべて 2xx だった。この alert はリクエスト処理中にプロセスが応答を返せなかった
# ケース専用（30日実測で 0 件）。
resource "google_monitoring_alert_policy" "youtube_function_failure" {
  display_name = "YouTube Function Platform Failure (5xx)"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "プラットフォーム強制終了(5xx)を検出"

    condition_threshold {
      filter = <<-EOT
        resource.type="cloud_run_revision"
        resource.labels.service_name="fetchyoutubevideos"
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
    # YouTube関数のプラットフォーム障害（5xx）

    fetchYouTubeVideos の呼び出しが 5xx で終了しました。エントリポイントは例外を catch して
    正常終了するため、これはアプリ内エラーではなくリクエストタイムアウト・プロセスクラッシュ等、
    プラットフォームが応答不能にしたケースを意味します。

    ## 確認事項
    1. Cloud Run のログ（service_name="fetchyoutubevideos"）で該当時刻の実行を確認
    2. タイムアウト（540s）に達していないか。週次フルスイープ（日曜4:00 JST）は
       uploads playlist の全ページ走査を行うため通常runより長い
    3. 直近のデプロイ・依存更新の有無

    ## 補足
    OOM によるインスタンス強制終了はここでは検知できない（アイドル中に発生し、
    リクエストは 2xx で完了するため）。そちらは「YouTube Function Error Alert」および
    「YouTube Function Memory Pressure」で検知する。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}

# ログベースメトリクス - discovery取りこぼし（uploads playlistにあるがFirestoreに未保存）
#
# 週次フルスイープ（日曜4:00 JST）が uploads playlist の全走査とFirestore既知集合を突合する。
# SPR-235: 旧実装は「Firestoreにあるがplaylistに無い」（＝YouTube側で削除/非公開になった
# 旧動画の残骸。2026-07実測で3回のスイープとも同一の8件が出続ける恒久的な床）と、
# 「playlistにあるがFirestoreに無い」（＝真の取りこぼし）を1本のWARNにまとめていたため、
# そのままアラート化すると毎週必ず鳴る状態だった。コード側でログを分離し、後者だけを
# `jsonPayload.alert` 付きで出すようにしたのでここで拾う（endpoints/youtube/video-discovery.ts）。
resource "google_logging_metric" "youtube_discovery_unsaved" {
  name    = "youtube_discovery_unsaved"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchyoutubevideos"
    jsonPayload.alert="youtube_discovery_unsaved"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "YouTube Discovery Unsaved Videos"
  }
}

resource "google_monitoring_alert_policy" "youtube_discovery_unsaved" {
  display_name = "YouTube Discovery Unsaved Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "発見済みだが未保存の動画を検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.youtube_discovery_unsaved.id}\" resource.type=\"cloud_run_revision\""

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
    # YouTube discovery の取りこぼし（未保存動画）

    週次フルスイープで、uploads playlist には存在するのに Firestore に保存されていない動画が
    見つかりました。incremental discovery（early-stop）の取りこぼし、または保存側で
    弾かれている可能性があります。放置するとその動画はサイトに永久に出ません。

    ## 確認事項
    1. 該当IDを特定: jsonPayload.alert="youtube_discovery_unsaved" の `未保存サンプル` を確認
    2. 保存側で弾かれていないか: 同時刻の `許可されていないチャンネルの動画をスキップしました` /
       `動画のEntity変換に失敗` / `動画にチャンネルIDがありません` を確認
    3. 弾かれていない場合は discovery の early-stop がその動画を跨いだ可能性。
       手動で週次フルスイープを流して再確認する:
       gcloud scheduler jobs run fetch-youtube-videos-weekly-full-sweep --location=asia-northeast1

    ## 鳴らないケース
    「Firestore にあるが uploads playlist に無い」（YouTube側で削除/非公開になった旧動画）は
    対象外で、INFO ログ `Firestoreにのみ存在する動画があります` に留めている（2026-07時点で
    常時8件の恒久的な床のため、アラート化すると毎週誤発火する・SPR-235）。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.youtube_discovery_unsaved
  ]
}

# ログベースメトリクス - クォータ不足の早期警告
#
# SPR-230 で discovery を search.list(100 units) から uploads playlist(1 unit) へ移行した結果、
# 消費は ~7,800 units/日 → 数百 units/日 に低下し、30日実測でクォータ関連の WARN/ERROR は 0件。
# つまりこれは「異常の兆候」であって常態ではない＝閾値 >0 で成立する。
#
# 注意（このメトリクスの限界）: 判定元の YouTubeQuotaMonitor はインスタンス内メモリの
# カウンタで、インスタンスの再起動・複数同時実行をまたいで合算されない（過小計上する）。
# 実際の超過は YouTube API 側が 403 quotaExceeded を返し `YouTube API 呼び出しエラー`（ERROR）
# として出るため、**超過検知の正本は youtube_error_count 側**。ここは早期警告に過ぎない。
resource "google_logging_metric" "youtube_quota_shortage" {
  name    = "youtube_quota_shortage"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="fetchyoutubevideos"
    (
      jsonPayload.message:"クォータが不足しています" OR textPayload:"クォータが不足しています"
      OR jsonPayload.message:"クォータ不足" OR textPayload:"クォータ不足"
      OR jsonPayload.message:"クォータ超過予測" OR textPayload:"クォータ超過予測"
    )
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "YouTube Quota Shortage"
  }
}

resource "google_monitoring_alert_policy" "youtube_quota_shortage" {
  display_name = "YouTube API Quota Shortage Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "クォータ不足/超過予測を検出"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.youtube_quota_shortage.id}\" resource.type=\"cloud_run_revision\""

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
    # YouTube Data API クォータ不足の兆候

    関数内のクォータ監視が「不足」または「超過予測」を報告しました。既定クォータは
    10,000 units/日（0:00 PT リセット）で、SPR-230 以降の平常時消費は数百 units/日です。
    平常時には出ないログのため、出た場合は消費構造が変わった可能性があります。

    ## 確認事項
    1. `YouTube API使用量詳細` ログで operation 別の消費を確認（どの呼び出しが増えたか）
    2. discovery が uploads playlist 経由のままか（search.list は 1回=100 units）
    3. playlist→videoマッピングの日次キャッシュが効いているか
       （`playlist→videoマッピングのキャッシュを再利用します` が出ているか）
    4. 新着が大量に出た日は一時的に増える（正常）。連日続く場合のみ調査対象

    ## 注意
    このアラートの判定元はインスタンス内メモリのカウンタのため過小計上する。実際の超過は
    YouTube API の 403 として `YouTube API 呼び出しエラー`（ERROR）で観測され、
    「YouTube Function Error Alert」側で発火する。
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.youtube_quota_shortage
  ]
}

# YouTube関数のメモリ逼迫アラート（OOM の予兆）
#
# SPR-235（2026-07 実測）: 256Mi 時代は memory utilization が常時 0.86〜1.00 に張り付き、
# 2026-07-23 に OOM でインスタンスが強制終了した。SPR-266 の fast_recheck（15分毎）投入で
# インスタンスが常時ウォームになり、毎時のコールドスタートによる暗黙のプロセスリサイクルが
# 無くなったことで顕在化した（インスタンス起動 24-26回/日 → 1-9回/日）。
# 同PRで 512Mi へ引き上げ済みのため、ベースラインは 0.45 前後まで下がる想定。
#
# 閾値 0.85・30分継続の根拠: 512Mi 化後のベースライン（~0.45）から十分離れており、
# 実測の増加ペース（37時間で約 +19MiB ≒ 256Mi 換算 +7.6pt）なら OOM の数日前に発火する。
# アイドル中の kill を事後に拾う youtube_error_count と違い、こちらは予兆で拾うのが役割。
resource "google_monitoring_alert_policy" "youtube_memory_pressure" {
  display_name = "YouTube Function Memory Pressure"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "メモリ使用率85%超が30分継続"

    condition_threshold {
      filter = <<-EOT
        resource.type="cloud_run_revision"
        resource.labels.service_name="fetchyoutubevideos"
        metric.type="run.googleapis.com/container/memory/utilizations"
      EOT

      # 分布メトリクスのため p99 で整列し、revision/インスタンス間は最大値で集約する
      # （デプロイ直後の新旧混在で、逼迫している側の系列が平均に埋もれないように）。
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.label.service_name"]
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "1800s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # YouTube関数のメモリ逼迫（OOM の予兆）

    fetchYouTubeVideos のメモリ使用率が 85% を30分以上超えています。放置すると
    プラットフォームがインスタンスを強制終了します（2026-07-23 に 256Mi で発生）。

    ## 背景（SPR-235）
    fast_recheck（15分毎）の投入でインスタンスが常時ウォームになり、run をまたぐメモリ蓄積が
    毎時のコールドスタートでリサイクルされなくなった。実測の増加ペースは 37時間で約 +19MiB で、
    デプロイ（インスタンス入れ替え）が2日以上無いと上限に到達する。

    ## 確認事項
    1. 現在の設定値を確認: gcloud run services describe fetchyoutubevideos --region=asia-northeast1 --format="value(spec.template.spec.containers[0].resources.limits.memory)"
    2. 使用率の推移を確認（単調増加ならリーク性の蓄積、スパイクなら特定runの一時消費）
    3. 直前の run で異常に多い件数を処理していないか（週次フルスイープ・大量の新着）

    ## 対応
    - 一時回避: 再デプロイでインスタンスを入れ替える（蓄積がリセットされる）
    - 恒久: 蓄積源の特定が必要（512Mi 化しても増加ペースが同じなら数日で再到達する）。
      調査は SPR-277 で追跡している
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}
