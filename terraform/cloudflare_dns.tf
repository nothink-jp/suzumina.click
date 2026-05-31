# ==============================================================================
# Cloudflare DNS レコード（例外管理）
# ==============================================================================
# 原則 DNS レコードは Cloudflare 側で管理し Terraform では持たない（cloudflare.tf 参照）。
# ただし以下は不具合是正のため例外的に Terraform 管理下に置く。
#
# SPF (send.suzumina.click TXT):
#   既存レコードが複数 character-string（"v=spf1" "include:amazonses.com" "~all"）で
#   保存されており、RFC 7208 §3.3 / RFC 1035 の連結規則で空白が消え
#   `v=spf1include:amazonses.com~all` となり SPF が permerror になる（SPR-93）。
#   単一 character-string へ是正するため既存レコードを import して管理する。
# ==============================================================================

resource "cloudflare_record" "resend_spf" {
  count = local.current_env.enable_custom_domain ? 1 : 0

  zone_id = data.cloudflare_zone.main[0].id
  name    = "send" # Cloudflare はサブドメイン名を相対形で保持（= send.suzumina.click）。FQDN にすると replace 扱いになる
  type    = "TXT"
  content = "v=spf1 include:amazonses.com ~all"
  ttl     = 1 # 1 = automatic
}
