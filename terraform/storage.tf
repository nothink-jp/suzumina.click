# Cloud Functions のソースコード保存バケット
resource "google_storage_bucket" "function_source" {
  project       = var.gcp_project_id
  name          = "${var.gcp_project_id}-functions-source" # 一意のバケット名を生成
  location      = "asia-northeast1" # 他のリソースと同じリージョン（東京）
  force_destroy = false # 誤削除防止のためfalseに設定

  # 標準のストレージクラスを使用
  storage_class = "STANDARD"

  # バージョニングを有効化（誤って削除されたファイルを復元可能に）
  versioning {
    enabled = true
  }

  # 均一なアクセス制御を使用（バケットレベルのIAM）
  uniform_bucket_level_access = true

  # ライフサイクルルール（古いバージョンやファイルを自動的に削除）
  lifecycle_rule {
    condition {
      # 30日以上前のオブジェクトに適用
      age = 30
      # 現在のバージョンには適用しない
      with_state = "ARCHIVED"
    }
    action {
      type = "DELETE"
    }
  }

  # 依存関係
  depends_on = [
    google_firebase_project.default,
  ]
}