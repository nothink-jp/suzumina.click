terraform {
  backend "gcs" {
    bucket = "suzumina-click-dev-tfstate" # 作成したGCSバケット名
    prefix = "terraform/state"           # バケット内の状態ファイルのパス
  }
}