# ==============================================================================
# DNS (Cloud DNS) 設定
# ==============================================================================
# 概要: カスタムドメインを管理するためのCloud DNSゾーンを定義します。
# ==============================================================================

# Cloud DNS マネージドゾーン（カスタムドメイン有効時のみ作成）
resource "google_dns_managed_zone" "main" {
  count = local.current_env.enable_custom_domain ? 1 : 0
  
  project     = var.gcp_project_id
  name        = "${replace(var.domain_name, ".", "-")}-zone"
  dns_name    = "${var.domain_name}."
  description = "Managed zone for ${var.domain_name}"

  labels = merge(local.common_labels, {
    "dns-zone" = replace(var.domain_name, ".", "-")
  })
}

# Cloud RunへのAレコード（カスタムドメイン有効時のみ作成）
resource "google_dns_record_set" "cloud_run" {
  count = local.current_env.enable_custom_domain && length(google_cloud_run_domain_mapping.custom_domain) > 0 ? 1 : 0
  
  project      = var.gcp_project_id
  managed_zone = google_dns_managed_zone.main[0].name
  name         = "${var.domain_name}."
  type         = "A"
  ttl          = 300

  # google_cloud_run_domain_mapping のリソースレコードを参照
  # domain_mappingが存在する場合のみ作成
  rrdatas = [for record in google_cloud_run_domain_mapping.custom_domain[0].status[0].resource_records : record.rrdata if record.type == "A"]
  
  depends_on = [
    google_cloud_run_domain_mapping.custom_domain,
    google_dns_managed_zone.main
  ]
}

# Cloud RunへのAAAAレコード（カスタムドメイン有効時のみ作成）
resource "google_dns_record_set" "cloud_run_aaaa" {
  count = local.current_env.enable_custom_domain && length(google_cloud_run_domain_mapping.custom_domain) > 0 ? 1 : 0
  
  project      = var.gcp_project_id
  managed_zone = google_dns_managed_zone.main[0].name
  name         = "${var.domain_name}."
  type         = "AAAA"
  ttl          = 300

  rrdatas = [for record in google_cloud_run_domain_mapping.custom_domain[0].status[0].resource_records : record.rrdata if record.type == "AAAA"]
  
  depends_on = [
    google_cloud_run_domain_mapping.custom_domain,
    google_dns_managed_zone.main
  ]
}

# Googleドメイン確認用TXTレコード
resource "google_dns_record_set" "domain_verification" {
  count = local.current_env.enable_custom_domain ? 1 : 0
  
  project      = var.gcp_project_id
  managed_zone = google_dns_managed_zone.main[0].name
  name         = "${var.domain_name}."
  type         = "TXT"
  ttl          = 300
  rrdatas      = ["google-site-verification=-exKNQxRVyFMAShs3esyT416TEUsqVUsFy4sTWM0H24"]
  
  depends_on = [google_dns_managed_zone.main]
}

# 出力: DNSのネームサーバー（カスタムドメイン有効時のみ）
output "dns_name_servers" {
  description = "Cloud DNS name servers"
  value       = local.current_env.enable_custom_domain ? google_dns_managed_zone.main[0].name_servers : []
}