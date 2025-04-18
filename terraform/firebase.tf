# Firebase Management API を有効化
resource "google_project_service" "firebase" {
  project = var.gcp_project_id
  service = "firebase.googleapis.com"
  disable_on_destroy = false
}

# Cloud Functions API を有効化
resource "google_project_service" "cloudfunctions" {
  project = var.gcp_project_id
  service = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

# Cloud Build API を有効化 (Functions のデプロイに必要)
resource "google_project_service" "cloudbuild" {
  project = var.gcp_project_id
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Secret Manager API を有効化 (Functions のシークレット利用に必要)
resource "google_project_service" "secretmanager" {
  project = var.gcp_project_id
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Cloud Run API を有効化 (Functions v2 の実行基盤)
resource "google_project_service" "run" {
  project = var.gcp_project_id
  service = "run.googleapis.com"
  disable_on_destroy = false
}

# Artifact Registry API を有効化 (Functions v2 のイメージ保存先)
resource "google_project_service" "artifactregistry" {
  project = var.gcp_project_id
  service = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Firestore API を有効化
resource "google_project_service" "firestore" {
  project = var.gcp_project_id
  service = "firestore.googleapis.com"
  disable_on_destroy = false # Keep Firestore data even if Terraform destroys the service enablement
}


# Firebase プロジェクトリソース
# 依存 API が有効になってから作成されるように依存関係を設定
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.gcp_project_id
  depends_on = [
    google_project_service.firebase,
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.secretmanager,
    google_project_service.run,
    google_project_service.artifactregistry,
    google_project_service.firestore, # Add dependency on Firestore API
  ]
}

# Firebase Hosting サイト
# Firebase プロジェクトが作成されてから作成されるように依存関係を設定
resource "google_firebase_hosting_site" "default" {
  provider = google-beta
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
  name        = "(default)" # Standard name for the default database
  location_id = "asia-northeast1" # Match the region of other resources
  type        = "FIRESTORE_NATIVE"

  depends_on = [
    google_firebase_project.default,
    google_project_service.firestore,
  ]
}