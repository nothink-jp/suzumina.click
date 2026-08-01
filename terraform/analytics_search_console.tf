# ------------------------------------------------------------------------------
# Search Console 連携用サービスアカウント（SPR-301 / SPR-137 §6-4 の集客判断）
# ------------------------------------------------------------------------------
# analytics_ga4.tf と同型の制約を持つ。terraform が管理できるのは **API を叩く GCP 側の
# identity だけ**で、次は terraform の管轄外なので変更したらこのコメントも更新すること:
#   - Search Console プロパティ側のアクセス権（オーナー/フルユーザー/制限付きユーザー）は
#     Search Console 管理画面でしか付与できない。google_project_iam_* では届かない
#   - ローカルで impersonate するために個人アカウントへ付与する
#     roles/iam.serviceAccountTokenCreator（search_console_reader 宛）は手動
#
# API の有効化は api_services.tf の google_project_service.searchconsole 側。
#
# なぜ ga4-reader@ を流用しないか: あちらは名前と description が GA4 の Admin/Data API 用と
# 宣言しており、Search Console を相乗りさせると「名前の約束と実際の権限」がずれる
# （CLAUDE.md 軸3）。プロパティへの手動追加はどちらにせよ SA 単位で必要なので、
# 流用しても手作業は減らない。

resource "google_service_account" "search_console_reader" {
  project      = var.gcp_project_id
  account_id   = "search-console-reader"
  display_name = "Search Console API SA (read-only)"
  description  = "Search Analytics API 用の SA。Search Console では制限付きユーザー（権限付与は Search Console 管理画面・手動）"
}
