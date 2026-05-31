# ==============================================================================
# Cloudflare CDN 設定
# ==============================================================================
# 概要: suzumina.click の前段 CDN として Cloudflare を利用する設定。
#
# 事前条件:
#   - Cloudflare ダッシュボードでゾーン（suzumina.click）を作成済みであること
#   - ドメインレジストラの NS レコードを Cloudflare の NS に変更済みであること
#
# DNS レコード（A/AAAA/MX/TXT 等）はゾーン追加時に Cloudflare が
# 自動インポートするため、このファイルでは管理しない。
# プロキシ（オレンジ雲）の有効化はダッシュボードで確認・設定すること。
# ==============================================================================

# Cloudflare ゾーン参照（本番環境のみ）
data "cloudflare_zone" "main" {
  count = local.current_env.enable_custom_domain ? 1 : 0

  name = var.domain_name
}

# ==============================================================================
# ゾーン設定
# ==============================================================================

resource "cloudflare_zone_settings_override" "main" {
  count = local.current_env.enable_custom_domain ? 1 : 0

  zone_id = data.cloudflare_zone.main[0].id

  settings {
    # SSL strict: Cloud Run ドメインマッピングは Google 発行の信頼済み証明書を使用
    ssl = "strict"

    # HTTP → HTTPS リダイレクト
    always_use_https = "on"

    # TLS 1.2 以上を必須化
    min_tls_version = "1.2"

    # HTTP/3 (QUIC) 有効化
    http3 = "on"

    # Brotli 圧縮有効化
    brotli = "on"

    # Rocket Loader は Next.js の Script 管理と競合するため無効化
    rocket_loader = "off"

    # 103 Early Hints で LCP 改善（ブラウザが HTML 受信前にリソース先読みを開始）
    early_hints = "on"
  }
}

# ==============================================================================
# キャッシュルール
# ==============================================================================
# ルールは上から順に評価され、最初にマッチしたルールが適用される。

resource "cloudflare_ruleset" "cache_rules" {
  count = local.current_env.enable_custom_domain ? 1 : 0

  zone_id = data.cloudflare_zone.main[0].id
  name    = "suzumina.click Cache Rules"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  # 1. API ルート: キャッシュ完全無効（認証・動的レスポンスを保護）
  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = false
    }
    expression  = "(starts_with(http.request.uri.path, \"/api/\"))"
    description = "API: キャッシュ無効"
    enabled     = true
  }

  # 2. Next.js 静的アセット: 1年キャッシュ（ビルドハッシュで immutable）
  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 31536000
      }
      browser_ttl {
        mode    = "override_origin"
        default = 31536000
      }
    }
    expression  = "(starts_with(http.request.uri.path, \"/_next/static/\"))"
    description = "Next.js 静的アセット: 1年キャッシュ"
    enabled     = true
  }

  # 3. Next.js 画像最適化エンドポイント (/_next/image?url=...): 1日キャッシュ
  #
  # 注意1: パスは末尾スラッシュ無しの "/_next/image"。
  #   /_next/image はクエリ string 型エンドポイント (/_next/image?url=...) のため
  #   http.request.uri.path は "/_next/image"。"/_next/image/" だと starts_with が
  #   false になりルールが一致せず、最適化画像がエッジ未キャッシュ (cf-cache-status: DYNAMIC) になる。
  #   ※ rule #2 の "/_next/static/" は直後に必ずサブパスが続くため末尾スラッシュでも一致する。
  # 注意2: optimizer は Vary: Accept で AVIF/WebP/JPEG を出し分けるが、Cloudflare は
  #   Accept をカスタムキャッシュキーに使えない (forbidden header / API err 20111)。
  #   "Vary for Images" (Cache Variants) は拡張子ベースで /_next/image (拡張子なし) には効かない。
  #   そのため Accept では分けず単一エントリでキャッシュする (cache=true で Vary を無視して
  #   キャッシュし、最初にキャッシュした形式を全クライアントに返す)。AVIF/WebP は現行ブラウザで
  #   ほぼ全対応のため実害は極小。形式別に厳密化する場合は Transform Rule で Accept を許可ヘッダ
  #   (例 x-img-fmt: avif|webp|jpeg) に正規化し cache key に含める (SPR-86 フォロー)。
  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 86400
      }
      browser_ttl {
        mode    = "override_origin"
        default = 86400
      }
    }
    expression  = "(starts_with(http.request.uri.path, \"/_next/image\"))"
    description = "Next.js 画像最適化: 1日キャッシュ"
    enabled     = true
  }

  # 4. ホームページ: PPR の動的セクション鮮度を担保しつつ TTFB 改善のため 60 秒エッジキャッシュ
  #
  # SPR-4 で ISR から PPR (Cache Components) に移行した結果、`/` のレスポンスは
  # 「静的シェル + 動的 streaming」の混在になる。CDN がレスポンス全体をキャッシュすると
  # 動的部分も TTL 期間中固定されるため、TTL は SLA（新着コンテンツ反映遅延 < 1分）に
  # 合わせて 60 秒に短縮する。
  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 60
      }
      browser_ttl {
        mode = "respect_origin"
      }
    }
    expression  = "(http.request.uri.path eq \"/\")"
    description = "ホームページ: PPR 動的鮮度確保のため 60 秒キャッシュ"
    enabled     = true
  }
}

# ==============================================================================
# 出力
# ==============================================================================

output "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  value       = local.current_env.enable_custom_domain ? data.cloudflare_zone.main[0].id : ""
}

output "cloudflare_name_servers" {
  description = "Cloudflare ネームサーバー（レジストラで NS を変更する際に使用）"
  value       = local.current_env.enable_custom_domain ? data.cloudflare_zone.main[0].name_servers : []
}
