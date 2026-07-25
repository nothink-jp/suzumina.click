# ------------------------------------------------------------------------------
# GA4 連携用サービスアカウント（SPR-279）
# ------------------------------------------------------------------------------
# GA4 のカスタムディメンションそのものは terraform で管理できない（GA4 は GCP リソースではなく
# Google Marketing Platform 側で、公式 provider に Analytics Admin API のリソースが無い）。
# 宣言の正本は apps/web/src/lib/analytics/ga4-custom-dimensions.json で、live への反映と
# drift 検出は scripts/check-ga4-drift.mjs が Admin API 経由で行う。
#
# つまり terraform が管理するのは **Admin API を叩く GCP 側の identity だけ**。
# 次の2つは terraform の管轄外なので、変更したらこのコメントも更新すること:
#   - GA4 プロパティ側のアクセス権（閲覧者/編集者）は GA4 管理画面でしか付与できない
#   - ローカルで --apply を実行するために個人アカウントへ付与済みの
#     roles/iam.serviceAccountTokenCreator（ga4_reader 宛）は手動のまま

# SPR-137 の調査時に手動作成された既存 SA を管理下へ取り込む（IaC 管理外だった＝PR #866 のレビュー指摘）。
import {
  to = google_service_account.ga4_reader
  id = "projects/${var.gcp_project_id}/serviceAccounts/ga4-reader@${var.gcp_project_id}.iam.gserviceaccount.com"
}

# GA4 プロパティでは「編集者」。ローカルから --apply（未登録の登録・description 同期）を実行するのに使う。
resource "google_service_account" "ga4_reader" {
  project      = var.gcp_project_id
  account_id   = "ga4-reader"
  display_name = "GA4 Admin/Data API SA"
  description  = "GA4 Data API / Admin API 用の SA。GA4 プロパティでは編集者（権限付与は GA4 管理画面・手動）"
}

# CI 用は読み取り専用の別 identity にする。ga4_reader は GA4 編集者であり、
# CI（PR から assume 可）に編集権限まで渡す必要がないため（drift 検出は読みだけで足りる）。
# GA4 プロパティ側では **閲覧者** として登録する（手動・GA4 管理画面）。
resource "google_service_account" "ga4_ci_reader" {
  project      = var.gcp_project_id
  account_id   = "ga4-ci-reader"
  display_name = "GA4 drift check (read-only) SA"
  description  = "CI の GA4 drift 検出用 SA。GA4 プロパティでは閲覧者のみ（権限付与は GA4 管理画面・手動）"
}

# CI は WIF で terraform-plan-sa を assume し、そこから ga4_ci_reader を impersonate する。
# 既存の WIF 連携先を増やさないため、index-drift ワークフローと同じ SA を入口に流用している。
resource "google_service_account_iam_member" "ga4_ci_reader_token_creator" {
  service_account_id = google_service_account.ga4_ci_reader.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.terraform_plan_sa.email}"

  depends_on = [
    google_service_account.ga4_ci_reader,
    google_service_account.terraform_plan_sa,
  ]
}
