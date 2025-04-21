/**
 * Terraformの状態ファイルをGoogle Cloud Storageで管理するための設定
 */
terraform {
  backend "gcs" {
    bucket = "suzumina-click-terraform-state"
    prefix = "terraform/state"
  }
}