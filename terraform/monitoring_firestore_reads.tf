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
 * 予算やコレクション規模が変われば `locals` の値を変えるだけで両方の閾値が追従する。
 *
 * ## 窓の取り方は実データで決めた
 *
 * read は元から極端にスパイキーで（1時間平均で 8/17 のピークは 567 read/秒、同じ日の谷は
 * 十数 read/秒）、**1時間平均 + 「N時間連続」では機能しない**。実データに当てて確認した:
 *
 *   1時間平均・警告(6時間連続) → 発火 1 回（8/18）。連続条件が厳しすぎて、谷で毎回リセットされ、
 *                                 予算メールと同日にしか鳴らない＝早期検知にならない
 *   1時間平均・緊急(2時間連続) → 発火 9 回。修正後の 8/19〜8/21 でも鳴る＝ノイズ
 *
 * 6時間平均に均すと素直に分離できる（同じ閾値のまま）:
 *
 *   警告(2バケット=12時間連続) → 8/15・8/17 に発火＝**予算メール(8/18)より3日早い**。
 *                                 平常日(8/09-8/13)は 8/13 に単発の超過が1回あるだけで、
 *                                 2バケット連続の条件がこれを落とす
 *   緊急(1バケット=6時間)      → 8/17 に1回のみ。修正後(8/19-8/21)では鳴らない
 *
 * 「平常時 11 read/秒 / 修正後 20〜24 / スパイク時 73〜94」という日次平均の水準に対して、
 * 警告は修正後もまだ鳴る。これは誤検知ではなく**実際に予算ペースを超えている**ことの反映で、
 * 一覧ページのキャッシュ修正が効けば下回る想定。鳴り続けるなら閾値ではなく残りの read を疑う。
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
    display_name = "read レートが予算100%ペースを12時間継続で超過"

    condition_threshold {
      filter = "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/read_count\""
      # 6時間平均を2バケット（=12時間）連続で超えたら発火。
      # 単発のクロールバーストを落としつつ、傾向としての上昇を捉える窓（冒頭の検証を参照）。
      duration        = "21600s"
      comparison      = "COMPARISON_GT"
      threshold_value = local.firestore_reads_per_second_at_budget

      aggregations {
        alignment_period     = "21600s"
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

    直近12時間の read レートが月額予算 ¥${local.monthly_budget_jpy} を使い切るペースを超え続けています。
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
    display_name = "read レートが予算200%ペースを6時間継続で超過"

    condition_threshold {
      filter = "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/document/read_count\""
      # 6時間平均が1バケットでもこの水準なら明らかな異常なので、連続を待たずに鳴らす。
      duration        = "0s"
      comparison      = "COMPARISON_GT"
      threshold_value = local.firestore_reads_per_second_at_budget * 2

      aggregations {
        alignment_period     = "21600s"
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

    直近6時間の read レートが月額予算 ¥${local.monthly_budget_jpy} の2倍を使い切るペースです。
    2026-08 の SPR-311 がこの水準でした（実データ再生では 8/17 に発火・予算メールより1日早い）。放置すると数日で予算を使い切ります。

    切り分けは警告アラート「Firestore 読み取り量 警告」のドキュメントを参照。
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}
