# ==============================================================================
# Cloud Firestore データベース設定
# ==============================================================================
# 概要: Cloud Firestoreデータベースのみを定義
# 注意: API有効化は api_services.tf で一元管理されています
# ==============================================================================

# Cloud Firestore データベース (Native mode)
# Firestore API が有効になってから作成
resource "google_firestore_database" "database" {
  project     = var.gcp_project_id
  name        = "(default)" # デフォルトデータベースの標準名称
  location_id = var.region # 他のリソースと同じリージョン
  type        = "FIRESTORE_NATIVE" # Firestoreネイティブモードを使用

  depends_on = [
    google_project_service.firestore,
  ]
}