/**
 * Terraformの状態ファイルをローカルで管理する設定（一時的）
 * 注：本番環境では GCS バケットを作成してから以下のようにGCSバックエンドに戻す
 * terraform {
 *   backend "gcs" {
 *     bucket = "suzumina-click-terraform-state"
 *     prefix = "terraform/state"
 *   }
 * }
 */
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}