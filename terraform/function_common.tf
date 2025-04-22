# ==============================================================================
# Cloud Functions 共通設定
# ==============================================================================
# 概要: 全てのCloud Functions間で共有される設定やリソース
# GitHub Actionsへの移行（2025年5月2日）により、ビルド関連リソースはCIで管理
# Terraformは基盤インフラの定義のみ担当
# ==============================================================================

# Functions のソースコードを zip アーカイブ
# 注: GitHub Actionsでビルド・デプロイするため、このリソースは廃止予定
# 互換性のために残しているが、今後は削除する予定
data "archive_file" "function_source_zip" {
  type        = "zip"
  source_dir  = "../apps/functions"
  output_path = "/tmp/function-source-${var.gcp_project_id}.zip"

  # node_modules など不要なファイルを除外
  excludes = [
    ".git",
    "node_modules",
    "firebase-debug.log",
    "firebase-debug.*.log",
    "*.local",
    ".gitignore",
    "package-lock.json",
    ".env*",
    "*.tsbuildinfo",
    ".DS_Store",
    ".firebase",
    ".vscode",
    "coverage",
    "src/**/*.test.ts",
  ]
}

# 関数ソースコード用のGCSバケット
# 注: GitHub Actionsへの移行により、このバケットはデプロイプロセスでのみ使用
# APIサービス有効化は firebase.tf で一元管理するため、この定義は削除
resource "google_storage_bucket" "function_source" {
  # バケット名をエラーメッセージにある実際のバケット名に変更
  name     = "suzumina-click-firebase-functions-source"
  location = var.region
  
  # 標準ストレージクラス
  storage_class = "STANDARD"

  # コンテンツがある場合でも削除を許可（リソース競合エラー解決のため）
  force_destroy = true
  
  # バージョニングを無効化
  versioning {
    enabled = false
  }
  
  # 公開アクセス防止
  public_access_prevention = "enforced"
  
  # ライフサイクルルール: 古いバージョンは30日後に削除
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 30
    }
  }
}

# zip アーカイブを GCS バケットにアップロード
# 注: GitHub Actionsでビルド・デプロイするため、このリソースは廃止予定
resource "google_storage_bucket_object" "function_source_archive" {
  name   = "source-${formatdate("YYYYMMDDhhmmss", timestamp())}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source_zip.output_path

  depends_on = [data.archive_file.function_source_zip]
}

# APIの有効化はfirebase.tfで一元的に管理するため、この重複定義を削除

# 共通出力値
output "function_source_bucket" {
  value       = google_storage_bucket.function_source.name
  description = "Cloud Functions ソースコード保存用バケット名"
}