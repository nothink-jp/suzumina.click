# ==============================================================================
# GCP APIサービス有効化
# ==============================================================================
# 概要: プロジェクトで使用するGCP APIサービスの有効化定義
# 注意: これらのAPIの無効化は既存のサービスに影響を与える可能性があるため、
#      disable_on_destroy = false を設定しています
# ==============================================================================

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