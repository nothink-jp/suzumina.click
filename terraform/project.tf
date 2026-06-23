# プロジェクト情報を取得
# function_* など複数ファイルが data.google_project.current.number を参照する共有 data source。
# （旧 billing.tf に同居していたが、予算機能の撤去に伴い独立ファイルへ移設。アドレスは不変。）
data "google_project" "current" {
  project_id = var.gcp_project_id
}
