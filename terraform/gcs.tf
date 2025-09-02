# ==============================================================================
# GCS (Google Cloud Storage) 設定
# ==============================================================================
# 概要: Terraformのstate管理用GCSバケットの定義
# ==============================================================================

# Terraformのstateファイルを保存するためのGCSバケット
resource "google_storage_bucket" "tfstate" {
  project       = var.gcp_project_id
  name          = "suzumina-click-tfstate"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false # 本番環境ではtrueにしない

  # バージョニングを有効にして、stateファイルの上書きミスを防ぐ
  versioning {
    enabled = true
  }

  # バケットへの公開アクセスを禁止
  public_access_prevention = "enforced"

  # ライフサイクルルール（例：古いバージョンのstateを削除）
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10
    }
  }

  # 誤削除防止
  lifecycle {
    prevent_destroy = true
  }
}