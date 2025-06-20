# ==============================================================================
# ネットワーク (VPC) 設定
# ==============================================================================
# 概要: プロジェクト専用のVPCとサブネットを定義します。
# ==============================================================================

# VPCネットワークの作成
resource "google_compute_network" "main" {
  project                 = var.gcp_project_id
  name                    = "${local.project_id}-vpc"
  auto_create_subnetworks = false # サブネットは手動で作成
  routing_mode            = "REGIONAL"
}

# Cloud Run / Functions 用のサブネット
resource "google_compute_subnetwork" "main" {
  project      = var.gcp_project_id
  name         = "${local.project_id}-subnet"
  ip_cidr_range = "10.0.0.0/24" # 必要に応じて変更してください
  region       = var.region
  network      = google_compute_network.main.id

  # 限定公開のGoogleアクセスを有効化
  private_ip_google_access = true
}

# Cloud NATの作成（外部へのアウトバウンド通信用）
resource "google_compute_router" "main" {
  project = var.gcp_project_id
  name    = "${local.project_id}-router"
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  project                            = var.gcp_project_id
  name                               = "${local.project_id}-nat"
  router                             = google_compute_router.main.name
  region                             = var.region
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  subnetwork {
    name                    = google_compute_subnetwork.main.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}