# ==============================================================================
# 公開 URL の外形監視（Cloudflare 経由・SPR-365）
# ==============================================================================
# Cloud Run のメトリクス（5xx 比率・レイテンシ）はオリジンに届いたリクエストしか見えない。DNS・Cloudflare・
# ドメインマッピングのどこかで止まるとオリジンには何も届かず、どのアラートも鳴らないまま落ちている。
# デプロイ後の Verify も run.app を直接叩くので、この経路は見ていない。そこで公開 URL を外から叩く。
#
# /api/health は Cloudflare のキャッシュルールで no-cache（cloudflare.tf の 1.）なので、毎回オリジンまで届く。
# Firestore も認証も触らない＝落ちたら「経路かプロセス」の問題に絞れる。
# monitoring_origin_bypass.tf の迂回検知は /api/health を数えない（それにこの check は Cloudflare 経由で来る）。
#
# コスト: 3 リージョン × 5 分間隔 = 月約 2.6 万リクエスト。cpu_idle=true（リクエスト課金）で /api/health は
# 数 ms なので課金はほぼ無い。uptime check 自体も無料枠内。
# min_instances=0 のため冷えたインスタンスに当たると cold start を待つので timeout を長めに取る。
resource "google_monitoring_uptime_check_config" "web_health" {
  count = local.current_env.enable_custom_domain && var.custom_domain != "" ? 1 : 0

  display_name = "suzumina.click /api/health（Cloudflare 経由）"
  project      = var.gcp_project_id
  period       = "300s"
  timeout      = "30s"

  # 最小の 3 リージョン。リージョン単位の一時的な経路障害は、下のアラートで「2 リージョン以上」として除く
  selected_regions = ["ASIA_PACIFIC", "USA_OREGON", "EUROPE"]

  http_check {
    path           = "/api/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  # 200 を返すのが Cloudflare のエラーページやチャレンジでないこと（route.ts の応答本文）を確かめる
  content_matchers {
    content = "\"status\":\"healthy\""
    matcher = "CONTAINS_STRING"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.gcp_project_id
      host       = var.custom_domain
    }
  }
}

resource "google_monitoring_alert_policy" "web_uptime" {
  count = length(google_monitoring_uptime_check_config.web_health)

  display_name = "suzumina.click 外形監視（Cloudflare 経由）"
  project      = var.gcp_project_id
  combiner     = "OR"

  # check_passed はリージョンごとの時系列。ALIGN_NEXT_OLDER で各リージョンの直近結果を取り、
  # REDUCE_COUNT_FALSE で「失敗しているリージョン数」にまとめる。
  # alignment_period は check の間隔（300s）の 2 倍にして、結果の届く遅れで欠測扱いにならないようにする。
  # 1 リージョンだけの失敗はそのリージョン側の経路の揺れとして無視し、2 リージョン以上が 5 分続いたら鳴らす。
  # 「5 分」は duration のこと。check の間隔（5 分）が加わるので、障害から通知まではおおむね 5〜10 分。
  # 復旧後も ALIGN_NEXT_OLDER が最大 10 分前の失敗結果を拾うため、インシデントが閉じるのもその分遅れる。
  conditions {
    display_name = "/api/health が 2 リージョン以上で 5 分間失敗"

    condition_threshold {
      filter = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.web_health[0].uptime_check_id}\""

      aggregations {
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = <<-EOT
    # suzumina.click の外形監視が失敗

    https://${var.custom_domain}/api/health が、Cloudflare 経由で 2 リージョン以上から 5 分間失敗しています。
    利用者から見てサイトが落ちている可能性が高いです。

    ## 切り分け（外側から順に）
    1. オリジンを直接（status.url は https:// 付き）: `curl -sS "$(gcloud run services describe suzumina-click-web --region ${var.region} --format 'value(status.url)')/api/health"`
       - 失敗 → Cloud Run 側（最新デプロイ・起動失敗のログ）。5xx 比率アラートも併せて見る
       - 成功 → 経路側（下へ）
    2. `curl -sSI https://${var.custom_domain}/api/health` の応答
       - Cloudflare のエラーページ（52x）→ Cloudflare とドメインマッピングの間（証明書・ドメインマッピングの状態）
       - 403 やチャレンジ → Cloudflare の WAF / Bot 対策が uptime check を弾いている（UA: GoogleStackdriverMonitoring-UptimeChecks）
       - 名前解決できない → DNS（Cloudflare のゾーン・レジストラの NS）
    3. Cloud Monitoring の Uptime checks 画面で、どのリージョンが何のエラーで失敗しているかを見る
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [google_monitoring_notification_channel.email]
}
