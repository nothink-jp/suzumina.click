# ==============================================================================
# Cloud Functions 共通設定
# ==============================================================================
# 概要: 全てのCloud Functions間で共有される設定やリソース
# GitHub Actionsへの移行（2025年5月2日）により、ビルド関連リソースはCIで管理
# Terraformは基盤インフラの定義のみ担当
# ==============================================================================

# 注: GitHub Actionsへの移行（2025年5月2日）完了により、
# 以前まであった以下のリソース定義はすべて削除しました：
# - Functions ソースコードのzipアーカイブ（archive_file）
# - ソースコード保存用GCSバケット（google_storage_bucket）
# - zipアーカイブアップロード（google_storage_bucket_object）
# - バケット名の出力変数（output）
#
# ビルド・デプロイプロセスはすべてGitHub Actionsで管理されるようになり、
# Terraformでは基盤インフラの定義のみを担当します。
# APIサービス有効化は firebase.tf で一元管理されています。
# 初回デプロイ用のダミーソースコード (zip)
data "archive_file" "dummy_function_source" {
  type        = "zip"
  output_path = "${path.module}/function-source-dummy.zip"
  source {
    content  = "exports.dummy = (req, res) => res.send('OK');"
    filename = "index.js"
  }
}

# ダミーソースコードをデプロイ用バケットにアップロード
resource "google_storage_bucket_object" "dummy_function_source" {
  name   = "function-source-dummy.zip"
  bucket = google_storage_bucket.functions_deployment.name
  source = data.archive_file.dummy_function_source.output_path

  depends_on = [
    google_storage_bucket.functions_deployment,
    data.archive_file.dummy_function_source,
  ]
}