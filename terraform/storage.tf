# ==========================================================
# ストレージリソース定義
# ==========================================================
# 注: GitHub Actionsへの移行（2025年5月2日）により
# ビルド関連のリソースはCI/CDパイプラインで管理されるようになりました。
# このファイルでのCloud Functions用バケット定義は削除し、
# function_common.tfに一元化しています。
# ==========================================================


# Cloud Functions デプロイ用 Storage バケット
resource "google_storage_bucket" "functions_deployment" {
  name     = "${var.gcp_project_id}-functions-deployment"
  location = var.region

  # バケットのライフサイクル管理
  lifecycle_rule {
    condition {
      age = 30 # 30日以上古いファイルを削除
    }
    action {
      type = "Delete"
    }
  }

  # バージョニングを無効化（デプロイファイルは履歴不要）
  versioning {
    enabled = false
  }

  # 均一なバケットレベルアクセス制御を有効化
  uniform_bucket_level_access = true

  labels = {
    purpose = "cloud-functions-deployment"
    env     = var.environment
  }
}

# ==========================================================
# IAM for Storage
# ==========================================================


# ----------------------------------------------------------
# functions_deployment バケット用 IAM
# ----------------------------------------------------------

# Cloud Functions デプロイ用サービスアカウントにバケットへのアクセス権限を付与
resource "google_storage_bucket_iam_member" "functions_deployer_storage_admin" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# Cloud Functions デプロイ用サービスアカウントにバケット一覧表示権限を付与
resource "google_storage_bucket_iam_member" "functions_deployer_storage_viewer" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# ==========================================================
# Outputs
# ==========================================================

# バケットの存在確認用の出力
output "functions_deployment_bucket" {
  description = "Cloud Functions デプロイ用 Storage バケット名"
  value       = google_storage_bucket.functions_deployment.name
}
