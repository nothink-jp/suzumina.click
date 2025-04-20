# Firebase Management API を有効化
resource "google_project_service" "firebase" {
  project = var.gcp_project_id
  service = "firebase.googleapis.com"
  disable_on_destroy = false # Terraform実行時にリソースを削除してもAPIは無効化しない
}

# Cloud Functions API を有効化
resource "google_project_service" "cloudfunctions" {
  project = var.gcp_project_id
  service = "cloudfunctions.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことで既存のCloud Functionsに影響を与えない
}

# Cloud Build API を有効化 (Functions のデプロイに必要)
resource "google_project_service" "cloudbuild" {
  project = var.gcp_project_id
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでCI/CDパイプラインに影響を与えない
}

# Secret Manager API を有効化 (Functions のシークレット利用に必要)
resource "google_project_service" "secretmanager" {
  project = var.gcp_project_id
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでシークレット管理に影響を与えない
}

# Cloud Run API を有効化 (Functions v2 の実行基盤)
resource "google_project_service" "run" {
  project = var.gcp_project_id
  service = "run.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでサービス実行環境に影響を与えない
}

# Artifact Registry API を有効化 (Functions v2 のイメージ保存先)
resource "google_project_service" "artifactregistry" {
  project = var.gcp_project_id
  service = "artifactregistry.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでコンテナイメージ管理に影響を与えない
}

# Firestore API を有効化
resource "google_project_service" "firestore" {
  project = var.gcp_project_id
  service = "firestore.googleapis.com"
  disable_on_destroy = false # Firestoreデータを維持するためにAPIを無効化しない
}


# Firebase プロジェクトリソース
# 依存 API が有効になってから作成されるように依存関係を設定
resource "google_firebase_project" "default" {
  provider = google-beta # Firebase リソースには google-beta プロバイダーが必要
  project  = var.gcp_project_id
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

# Firebase Hosting サイト
# Firebase プロジェクトが作成されてから作成されるように依存関係を設定
resource "google_firebase_hosting_site" "default" {
  provider = google-beta # Firebase リソースには google-beta プロバイダーが必要
  project  = var.gcp_project_id
  site_id  = var.gcp_project_id # デフォルトサイトIDはプロジェクトIDと同じ
  depends_on = [
    google_firebase_project.default
  ]
}

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