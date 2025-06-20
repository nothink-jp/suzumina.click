/**
 * Terraformの状態ファイルをGCSで管理する設定
 *
 * Terraformの実行状態（.tfstate）をGCSバケットで一元管理します。
 * これにより、チームでの共同作業やCI/CDパイプラインからの実行が安全になります。
 */
terraform {
  backend "gcs" {
    bucket = "suzumina-click-tfstate" # このバケット名は事前に作成しておく必要があります
    prefix = "terraform/state"
  }
}