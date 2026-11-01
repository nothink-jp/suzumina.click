/**
 * monitoring.tf
 * Cloud Monitoring関連のリソース定義
 */
# web の 5xx 比率（SPR-365）
# 以前は 5xx の request_count を ALIGN_RATE（毎秒の件数）にして 0.05 と比べていた＝名前は「5xx > 5%」なのに
# 中身は「5xx が毎秒 0.05 件（=3 件/分）超」で、分母のない件数アラートだった。
# 比率は 5xx ÷ 全リクエストを PromQL で書く（MQL は新規非推奨）。
#
# 低トラフィックなので比率だけだと 1 件の 500 で鳴る（実測 2026-10-02〜11-01: 5 分あたりの全リクエストは
# 中央値 8 件・5 パーセンタイル 2 件）。そこで「5xx が窓内に min_count 件以上」を AND で併記し、単発の 500 は
# 拾わず、連続して落ちているときだけ鳴らす。同期間の 5xx は 6 件で、この条件で鳴るのは 2026-10-11 の
# 1 窓（10 件中 4 件が 500）だけだった。
# 分母には uptime check（monitoring_uptime.tf）の 2xx も入る（5 分あたり約 3 件）。比率は薄まるが、
# 発火を決めるのは主に件数の下限の方なので許容する。
locals {
  web_5xx_alert = {
    window    = "5m"
    ratio     = 0.05
    min_count = 3
  }
  web_request_count_selector = "monitored_resource=\"cloud_run_revision\",service_name=\"${google_cloud_run_v2_service.nextjs_app.name}\""
}

resource "google_monitoring_alert_policy" "cloud_run_error_rate" {
  display_name = "Cloud Run エラー率アラート"
  combiner     = "OR"

  conditions {
    display_name = "5xx 比率 > ${local.web_5xx_alert.ratio * 100}%（${local.web_5xx_alert.window} 窓・5xx ${local.web_5xx_alert.min_count} 件以上）"

    # sum() で revision / response_code を 1 本にまとめてから割る（ラベル無しのベクトル同士なので and も素直に一致する）。
    condition_prometheus_query_language {
      query               = <<-EOT
        (
          sum(increase(run_googleapis_com:request_count{${local.web_request_count_selector},response_code_class="5xx"}[${local.web_5xx_alert.window}]))
            /
          sum(increase(run_googleapis_com:request_count{${local.web_request_count_selector}}[${local.web_5xx_alert.window}]))
        ) > ${local.web_5xx_alert.ratio}
        and
        sum(increase(run_googleapis_com:request_count{${local.web_request_count_selector},response_code_class="5xx"}[${local.web_5xx_alert.window}])) >= ${local.web_5xx_alert.min_count}
      EOT
      duration            = "0s" # 窓（5 分）自体が継続判定を兼ねる
      evaluation_interval = "60s"
    }
  }

  # 5xx が止まるとクエリ結果が空になり条件が外れる。無トラフィック帯で OPEN が残らないよう短めに閉じる
  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # Cloud Run の 5xx 比率が閾値を超過

    suzumina-click-web で、直近 ${local.web_5xx_alert.window} の 5xx が全リクエストの ${local.web_5xx_alert.ratio * 100}% を超え、
    かつ ${local.web_5xx_alert.min_count} 件以上ありました（単発の 500 では鳴らない）。

    ## 確認事項
    1. Cloud Logging でエラー詳細を確認（`severity>=ERROR` と requests ログの `httpRequest.status>=500`）
    2. 最新のデプロイとの関連を確認
    3. 必要に応じてロールバック（`gcloud run services update-traffic suzumina-click-web --to-revisions=<前リビジョン>=100`）
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}

# 通知チャンネル - メール
resource "google_monitoring_notification_channel" "email" {
  display_name = "管理者メール通知"
  type         = "email"

  labels = {
    email_address = var.admin_email
  }

  project = var.gcp_project_id
}

# Cloud Run 自動スケーリングのアラート
resource "google_monitoring_alert_policy" "cloud_run_scaling" {
  display_name = "Cloud Run スケーリング通知"
  combiner     = "OR"

  # 閾値は max_instances から導く。以前は固定値 5 だったが max_instances は 2 のため構造的に発火しなかった（SPR-326）。
  # 上限に達するとそれ以上スケールできず、超過分のリクエストは待たされる。短い突発（デプロイ時の切替等）は
  # duration で除外し、上限への張り付きだけを通知する。
  conditions {
    display_name = "インスタンス数が上限 (${local.current_env.cloud_run_max_instances}) に張り付き"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/container/instance_count\" AND metric.labels.state=\"active\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = local.current_env.cloud_run_max_instances - 1

      # 数えるのは active のみ。idle を含めると、数分の突発でスケールアウトした 2 台目が
      # Cloud Run の idle 保持（約 15 分）で残るだけで 5 分を超え、張り付いていないのに鳴り続ける
      # （#995 適用後 32 時間で 13 回発火・429/5xx は 0。active=2 の最長連続は 2 分だった）。
      # idle が残っている間は受け皿があるので「上限に張り付き」ではない。
      # 合計は revision 単位で取る: max_instances は revision ごとの上限で、service 全体で合計すると
      # デプロイ直後に旧 revision と新 revision が並ぶたびに誤発火するため。
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MAX"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name", "resource.label.revision_name"]
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
    # Cloud Run インスタンス数が上限に張り付き

    suzumina-click-web のインスタンス数が max_instances（terraform/locals.tf）に 5 分以上張り付いています。
    これ以上スケールできないため、超過分のリクエストは待たされるかタイムアウトします。

    ## 確認事項
    1. トラフィックパターン（クローラの急増・DoS の可能性）
    2. 1 リクエストあたりの処理時間が延びていないか（P95 レイテンシアラートと併せて見る）
    3. 恒常的なら max_instances の引き上げとコスト影響の評価
    EOT
    mime_type = "text/markdown"
  }

  project = var.gcp_project_id

  depends_on = [google_monitoring_notification_channel.email]
}