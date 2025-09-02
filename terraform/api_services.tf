# ==============================================================================
# GCP APIサービス有効化
# ==============================================================================
# 概要: プロジェクトで使用するGCP APIサービスの有効化定義
# 注意: これらのAPIの無効化は既存のサービスに影響を与える可能性があるため、
#      disable_on_destroy = false を設定しています
# ==============================================================================

# Cloud Resource Manager API を有効化 (プロジェクト管理とIAM操作に必要)
resource "google_project_service" "cloudresourcemanager" {
  project            = var.gcp_project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false # プロジェクト管理機能を維持するためAPIを無効化しない
}

# Cloud Functions API を有効化
resource "google_project_service" "cloudfunctions" {
  project            = var.gcp_project_id
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことで既存のCloud Functionsに影響を与えない
}

# Cloud Build API を有効化 (Functions のデプロイに必要)
resource "google_project_service" "cloudbuild" {
  project            = var.gcp_project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでCI/CDパイプラインに影響を与えない
}

# Secret Manager API を有効化 (Functions のシークレット利用に必要)
resource "google_project_service" "secretmanager" {
  project            = var.gcp_project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでシークレット管理に影響を与えない
}

# Cloud Run API を有効化 (Functions v2 の実行基盤)
resource "google_project_service" "run" {
  project            = var.gcp_project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでサービス実行環境に影響を与えない
}

# Artifact Registry API を有効化 (Functions v2 のイメージ保存先)
resource "google_project_service" "artifactregistry" {
  project            = var.gcp_project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false # APIを無効化しないことでコンテナイメージ管理に影響を与えない
}

# Firestore API を有効化
resource "google_project_service" "firestore" {
  project            = var.gcp_project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false # Firestoreデータを維持するためにAPIを無効化しない
}


# Cloud Scheduler API を有効化 (定期実行に必要)
resource "google_project_service" "cloudscheduler" {
  project            = var.gcp_project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false # スケジュール実行に影響を与えないためAPIを無効化しない
}

# Pub/Sub API を有効化 (スケジューラとFunctions間の連携に必要)
resource "google_project_service" "pubsub" {
  project            = var.gcp_project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false # メッセージング基盤に影響を与えないためAPIを無効化しない
}

# IAM API を有効化 (Service Account管理に必要)
resource "google_project_service" "iam" {
  project            = var.gcp_project_id
  service            = "iam.googleapis.com"
  disable_on_destroy = false # IAM管理機能を維持するためAPIを無効化しない
}

# Compute Engine API を有効化 (Cloud Functions v2 実行環境に必要)
resource "google_project_service" "compute" {
  project            = var.gcp_project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false # 実行環境を維持するためAPIを無効化しない
}

# Eventarc API を有効化 (Functions v2 トリガーに必要)
resource "google_project_service" "eventarc" {
  project            = var.gcp_project_id
  service            = "eventarc.googleapis.com"
  disable_on_destroy = false # イベント処理基盤を維持するためAPIを無効化しない
}