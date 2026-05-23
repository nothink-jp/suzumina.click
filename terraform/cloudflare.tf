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
    expression  = "(http.request.uri.path matches \"^/api/\")"
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
    expression  = "(http.request.uri.path matches \"^/_next/static/\")"
    description = "Next.js 静的アセット: 1年キャッシュ"
    enabled     = true
  }

  # 3. Next.js 画像最適化エンドポイント: 1日キャッシュ
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
    expression  = "(http.request.uri.path matches \"^/_next/image/\")"
    description = "Next.js 画像最適化: 1日キャッシュ"
    enabled     = true
  }

  # 4. ホームページ: ISR の revalidate=300 に合わせた5分エッジキャッシュ
  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 300
      }
      browser_ttl {
        mode = "respect_origin"
      }
    }
    expression  = "(http.request.uri.path eq \"/\")"
    description = "ホームページ: ISRに合わせた5分キャッシュ"
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
