/**
 * monitoring_firestore_reads.tf
 * Firestore 読み取り量のアラート（SPR-311）
 *
 * 背景: 2026-08 に `/creators/[id]` が 1 ページ表示ごとに全作品を読む構造（3N+2 read/表示）で
 * read が急増し、月額予算 ¥3,000 を Firestore read 単独で使い切った。このとき**検知できたのは
 * 予算 100% 到達メール**、つまり月の 18 日目で、しかも「使い切ってから」だった。
 * read 量そのものを見るアラートが無かったのが問題なので、ここで塞ぐ。
 *
 * 閾値は恣意的な数字ではなく**予算から逆算**する。Firestore read は実質この請求の全額を
 * 占めるので、read レートはそのまま予算消化ペースの代理指標になる。
 * 単価は Billing Catalog の `Cloud Firestore Read Ops Tokyo`（¥0.00006222/read・2026-08 時点）。
 *
 *   ¥3,000/月 ÷ ¥0.00006222 = 48,216,008 read/月 = 1,607,200 read/日 = 18.6 read/秒
 *
 * 実績との対比:
 *   平常時(8/12)          11.5 read/秒
 *   修正後(8/19, 8/20)    20.1 / 24.2 read/秒
 *   スパイク(8/17, 8/18)  72.8 / 94.2 read/秒  ← これを検知したい
 *
 * 予算やコレクション規模が変われば `locals` の値を変えるだけで両方の閾値が追従する。
 */

locals {
  # Cloud Firestore Read Ops Tokyo の JPY 単価（Billing Catalog API から取得・2026-08 時点）。
  # 過去に 6.057e-05 → 6.222e-05 と改定されているので、コスト推計時は catalog を引き直すこと。
  firestore_read_price_jpy = 0.00006222

  # 月額予算（billing budget「希望予算」と揃える）
  monthly_budget_jpy = 3000

  # 予算 100% ペースを read/秒 に換算した値
  firestore_reads_per_second_at_budget = (
    local.monthly_budget_jpy / local.firestore_read_price_jpy / 30 / 86400
  )
}

# 予算ペース超過（警告）
resource "google_monitoring_alert_policy" "firestore_read_rate_warning" {
  display_name = "Firestore 読み取り量 警告（予算100%ペース超過）"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "read レートが予算100%ペースを6時間継続で超過"

    condition_threshold {
      filter = "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/read_count\""
      # 1時間平均で見る。read は元から極端にスパイキー（平常 3〜6万/時 に対し
      # 8/17 11時は 222万/時）なので、短い窓で見ると通常の巡回でも鳴ってしまう。
      duration        = "21600s" # 6時間継続。単発のクロールバーストではなく傾向の変化を捉える
      comparison      = "COMPARISON_GT"
      threshold_value = local.firestore_reads_per_second_at_budget

      aggregations {
        alignment_period     = "3600s"
        per_series_aligner   = "ALIGN_RATE"
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
    # Firestore 読み取りが予算ペースを超過

    直近6時間の read レートが月額予算 ¥${local.monthly_budget_jpy} を使い切るペースを超え続けています。
    このまま推移すると月末に予算超過します。まだ超過はしていない段階の警告です。

    ## 切り分け（SPR-311 で有効だった順）

    1. **Cloud Run のリクエスト数を先に見る。** 横ばいなら**トラフィック増ではなくコード起因**
       （1リクエストあたりの read が増えた）。SPR-311 はこれで一発だった。
    2. 直近のデプロイと時刻を突き合わせる。一覧・詳細ページのデータ取得を変えていないか。
    3. アクセスの多いパスを Cloud Logging で数え、`リクエスト数 × そのページ1回あたりの read`
       で積む。エンティティごとの件数は count 集計（runAggregationQuery）で無料同然に取れる。

    ## 過去にやらかした構造（再発を疑う先）

    - 一覧ページが「全件取得 → in-memory で slice」になっていないか（read が表示件数ではなく
      コレクション件数に比例していないか）
    - キャッシュのキーに page / sort / search が入っていないか（組み合わせごとに全件取得が走る）
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}

# 予算ペースの2倍（緊急）
resource "google_monitoring_alert_policy" "firestore_read_rate_critical" {
  display_name = "Firestore 読み取り量 緊急（予算200%ペース超過）"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "read レートが予算200%ペースを2時間継続で超過"

    condition_threshold {
      filter          = "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/read_count\""
      duration        = "7200s" # 2時間継続。この水準は明らかな異常なので警告より早く鳴らす
      comparison      = "COMPARISON_GT"
      threshold_value = local.firestore_reads_per_second_at_budget * 2

      aggregations {
        alignment_period     = "3600s"
        per_series_aligner   = "ALIGN_RATE"
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
    # Firestore 読み取りが予算の2倍ペース

    直近2時間の read レートが月額予算 ¥${local.monthly_budget_jpy} の2倍を使い切るペースです。
    2026-08 の SPR-311（72.8〜94.2 read/秒）がこの水準でした。放置すると数日で予算を使い切ります。

    切り分けは警告アラート「Firestore 読み取り量 警告」のドキュメントを参照。
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}
