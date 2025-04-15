# Cloud Functions のソースコードをアップロードするための GCS バケット
resource "google_storage_bucket" "function_source" {
  project                     = var.gcp_project_id
  name                        = "${var.gcp_project_id}-function-source" # プロジェクト内で一意な名前
  location                    = "ASIA-NORTHEAST1" # Functions と同じリージョン
  uniform_bucket_level_access = true              # 推奨されるアクセス制御

  # バケット削除時にオブジェクトも削除する (必要に応じて false に変更)
  force_destroy = true

  # Functions のデプロイプロセスがアクセスできるようにライフサイクルルールを設定することも検討
  # lifecycle_rule {
  #   action {
  #     type = "Delete"
  #   }
  #   condition {
  #     age = 1 # 例: 1日後に古いソースコードを削除
  #   }
  # }

  depends_on = [
    # Artifact Registry API が有効になってから作成 (直接の依存はないが念のため)
    google_project_service.artifactregistry
  ]
}