# ==============================================================================
# 外向きの固定 IP（DLsite 取り込み用・SPR-423）
# ==============================================================================
# Cloud Run / Functions の外向きの通信は、既定では Google の共有 IP プールから出る。
# 2026-11-16 15:06 JST から、DLsite（Cloudflare）がこの送信元をブロックし続けた
# （404 + Retry-After。こちらの送信が 1 時間に 2 件でも、300 秒のブロックが切れるたびに
# 掛かり直した＝判定の単位をほかの利用者と共有していると見ている）。同じ時刻に日本の家庭用回線
# からは取得できた。そこで、DLsite 取り込みの送信元を自前の静的 IP 1 つに固定する。
#
# 仕組み: 関数を Direct VPC egress（all-traffic）でこのサブネットにつなぎ、サブネットの
# 外向きを Cloud NAT + 静的 IP に通す。**このファイルはネットワーク側だけ**を作る。
# 関数をつなぐ設定（--network / --subnet / --direct-vpc-egress）の正本は
# .github/workflows/deploy-functions.yml（Functions の spec は workflow が正本＝ADR-009）。
# つなぐまで、ここのリソースを通る通信は無い。
#
# 効かない場合: ブロックの単位が IP より広い（Google Cloud の IP 範囲・事業者）なら、固定しても
# 通らない。そのときは workflow のフラグを外してから、このファイルを消す。
#
# 費用（月額の概算）: 静的 IP 約 $3.6 + NAT ゲートウェイ 最大 約 $1 + データ処理 約 $1 未満。

# 既存の default ネットワークには頼らない（有無・ファイアウォールが terraform 管理外のため）。
# ファイアウォールルールは作らない: 外向きは暗黙の許可、内向きは暗黙の拒否で足りる
# （Direct VPC egress は外向き専用。このネットワークに内向きの通信を受けるものは無い）。
resource "google_compute_network" "egress" {
  project                 = var.gcp_project_id
  name                    = "egress"
  description             = "外向きの固定 IP 用（DLsite 取り込み・SPR-423）"
  auto_create_subnetworks = false

  depends_on = [google_project_service.compute]
}

# Direct VPC egress の要件は /26 以上。インスタンス数の 2 倍の IP を使う（max-instances 1 なら 2 個）。
# Jobs 化（SPR-417）で同じサブネットを使う余地も見て /26（62 個）にしている。
resource "google_compute_subnetwork" "egress_tokyo" {
  project       = var.gcp_project_id
  name          = "egress-${var.region}"
  region        = var.region
  network       = google_compute_network.egress.id
  ip_cidr_range = "10.8.0.0/26"

  # all-traffic にすると Firestore など Google の API 宛ても VPC を通る。限定公開の Google アクセスを
  # 有効にして、それらを NAT に通さない（NAT のデータ処理料金と、静的 IP のポート消費を避ける）。
  private_ip_google_access = true
}

# DLsite から見える送信元。この値を変えると、相手側のレート制限の履歴も変わる点に注意。
resource "google_compute_address" "egress_nat" {
  project     = var.gcp_project_id
  name        = "egress-nat"
  region      = var.region
  description = "Cloud NAT の外向き IP（DLsite 取り込みの送信元・SPR-423）"

  depends_on = [google_project_service.compute]
}

resource "google_compute_router" "egress" {
  project = var.gcp_project_id
  name    = "egress"
  region  = var.region
  network = google_compute_network.egress.id
}

# IP は手動割り当て（AUTO_ONLY だと送信元が固定にならない）。対象は上のサブネットだけ。
resource "google_compute_router_nat" "egress" {
  project = var.gcp_project_id
  name    = "egress"
  region  = var.region
  router  = google_compute_router.egress.name

  nat_ip_allocate_option = "MANUAL_ONLY"
  nat_ips                = [google_compute_address.egress_nat.self_link]

  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  subnetwork {
    name                    = google_compute_subnetwork.egress_tokyo.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  # NAT が落とした通信だけを残す（ポート枯渇などの切り分け用。全件は量が多いので取らない）
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

output "egress_nat_ip" {
  description = "DLsite 取り込みの外向きの固定 IP（Cloud NAT）"
  value       = google_compute_address.egress_nat.address
}
