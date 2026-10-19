# ==============================================================================
# Cloudflare を迂回した web オリジンへのアクセスの検知（SPR-366）
# ==============================================================================
# Cloud Run のドメインマッピングの入口（ghs.googlehosted.com）に `Host: suzumina.click` で直接つなぐと、
# Cloudflare（キャッシュ・今後の WAF / レート制限）を通らずにオリジンへ届く（2026-10-19 確認）。
# Host は正規なので proxy.ts の ALLOWED_HOSTS では区別できない。遮断は複雑さに見合わないため
# まず検知だけを置く（遮断するかの判断は SPR-367）。
#
# requests ログの httpRequest.remoteIp は GFE から見た接続元で、Cloudflare 経由なら Cloudflare の IP 帯になる。
# 実測（2026-10-19・直近 24h の 5,000 件）: Cloudflare 帯 4,979 件 / それ以外は検証とデプロイの curl だけ。
# 限界: 他人が自分の Cloudflare アカウント経由で来ると Cloudflare 帯になるため、この方法では検知できない。
# 104.28.0.0/14 は Cloudflare の持ち物だが WARP 等の出口で、オリジンへの接続には使われない（下の一覧に含めない）。
# ここから届くのは、うちのゾーンを通っていない本物の迂回。

locals {
  # 出典: https://www.cloudflare.com/ips/ （2026-10-19 取得）。めったに変わらないので自動追従はしない。
  # Cloudflare が帯を足したのにここが古いままだと、正規のアクセスが迂回として数えられてアラートが鳴る
  # （黙って見逃す側ではなく、気づける側に倒れる）。鳴ったら remoteIp を出典と突き合わせてここを直す。
  cloudflare_ip_ranges = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ]
}

# ログベースメトリクス - Cloudflare 以外から届き、応答が成功した web へのリクエスト
resource "google_logging_metric" "origin_bypass_requests" {
  name    = "web_origin_bypass_requests"
  project = var.gcp_project_id

  # /api/health はデプロイの Verify（run.app を直接叩く）と probe なので除く。部分一致（`:`）だと
  # クエリに "/api/health" を含めるだけで除外されるため、パスで判定する（`\?` は HCL と Logging の
  # エスケープ解釈が絡むので `[?]` で書く）。
  # status<400 で、ALLOWED_HOSTS により 404 になる run.app への直アクセス（塞がっているもの）を除く。
  # proxy.ts の matcher 外で 200 になる run.app の /_next/image などは数える。
  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${google_cloud_run_v2_service.nextjs_app.name}"
    LOG_ID("run.googleapis.com/requests")
    NOT httpRequest.requestUrl=~"^https?://[^/]+/api/health([?]|$)"
    httpRequest.status<400
    NOT (${join(" OR ", [for range in local.cloudflare_ip_ranges : "ip_in_net(httpRequest.remoteIp, \"${range}\")"])})
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "Web origin requests bypassing Cloudflare"
  }
}

resource "google_monitoring_alert_policy" "origin_bypass" {
  display_name = "Cloudflare を迂回した web オリジンへのアクセス"
  project      = var.gcp_project_id
  combiner     = "OR"

  # 閾値は「調査の curl や死活監視では鳴らず、継続的な巡回では鳴る」境界。実測（2026-10-19 時点の 30 日）では
  # このメトリクスの対象は 15 件・1 時間あたり最大 4 件だった（調査の curl と、毎週 1 回 HEAD を 3 回送ってくる
  # 何かの死活監視）。迂回経路を見つけたクローラなら 1 時間で数十〜数百件になる。
  # リビジョンごとに分かれる時系列（デプロイをまたぐ場合）を REDUCE_SUM で 1 本にまとめてから比べる。
  conditions {
    display_name = "Cloudflare 以外からの成功リクエストが 1 時間に 20 件超"

    condition_threshold {
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.origin_bypass_requests.name}\" resource.type=\"cloud_run_revision\""

      aggregations {
        alignment_period     = "3600s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 20
      duration        = "0s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  alert_strategy {
    auto_close = "3600s"
  }

  documentation {
    content   = <<-EOT
    # Cloudflare を迂回した web オリジンへのアクセス

    Cloudflare の IP 帯の外から web（Cloud Run）へ届き、成功したリクエストが 1 時間に 20 件を超えました。
    Cloudflare のキャッシュ（と WAF / レート制限）を通らずに、オリジンで SSR と Firestore read が起きています。

    ## 確認
    ```bash
    gcloud logging read "$(gcloud logging metrics describe web_origin_bypass_requests --format='value(filter)')" \
      --freshness=1d --limit=50 \
      --format='table(timestamp,httpRequest.remoteIp,httpRequest.requestUrl,httpRequest.userAgent)'
    ```

    ## 切り分け
    1. remoteIp が Cloudflare の帯（https://www.cloudflare.com/ips/）に入っている
       → `monitoring_origin_bypass.tf` の `cloudflare_ip_ranges` が古い。一覧を直す
    2. Host が `suzumina.click`（ドメインマッピング経由の迂回）、または run.app の `/_next/image` など
       → 迂回が実際に起きている。遮断するかを SPR-367 で判断する
    3. 自分たちの調査の curl → 対応不要
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.origin_bypass_requests
  ]
}
