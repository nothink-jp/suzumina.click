# ==============================================================================
# Firebase リソース設定
# ==============================================================================
# 概要: Firebase関連のリソースのみを定義
# 注意: API有効化は api_services.tf に移動しました
# 注意: Firebase HostingはCloud Runに置き換わったため削除しました
# ==============================================================================

# Firebase Management API を有効化
resource "google_project_service" "firebase" {
  project = var.gcp_project_id
  service = "firebase.googleapis.com"
  disable_on_destroy = false # Terraform実行時にリソースを削除してもAPIは無効化しない
}

# Firebase プロジェクトリソース
# 依存 API が有効になってから作成されるように依存関係を設定
resource "google_firebase_project" "default" {
  provider = google-beta # Firebase リソースには google-beta プロバイダーが必要
  project  = var.gcp_project_id

  # デフォルトのFirebaseホスティングサイトは削除できないため、必要に応じてインポートが必要
  lifecycle {
    # 自動生成されたリソースの変更を無視
    # display_nameとdefault_gc_locationは不適切な属性なので削除
  }

  depends_on = [
    google_project_service.firebase,
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.secretmanager,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.firestore, # Firestore APIへの依存関係を追加
  ]
}

# 注意: デフォルトのFirebaseホスティングサイトを削除しようとするとエラーが発生します
# エラー解決のためには、以下のいずれかの方法を試してください：
# 
# 1. Terraformステートからホスティングサイトの参照を削除する:
#    terraform state rm google_firebase_hosting_site.default
#
# 2. 既存のサイトをインポートする（Cloud Runに移行済みでも必要）:
#    terraform import google_firebase_hosting_site.default projects/suzumina-click-firebase/sites/suzumina-click-firebase
#
# 3. 別の名前のサイトとして扱う:
#    必要に応じて新しいリソースを定義し、別名で管理する

# Firebase Hosting サイトの定義は削除 - Cloud Runに移行済み (2025-04-28)
# firebase.tfへの言及が残っている箇所でも「廃止済み」と明記されています

# Firestore データベース (Native mode)
# Firebase プロジェクトと Firestore API が有効になってから作成
resource "google_firestore_database" "database" {
  project     = var.gcp_project_id
  name        = "(default)" # デフォルトデータベースの標準名称
  location_id = "asia-northeast1" # 他のリソースと同じリージョン（東京）
  type        = "FIRESTORE_NATIVE" # Firestoreネイティブモードを使用

  depends_on = [
    google_firebase_project.default,
    google_project_service.firestore,
  ]
}