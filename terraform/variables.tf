# GCPプロジェクトID
variable "gcp_project_id" {
  description = "GCPプロジェクトのID（例：'my-project-123'）"
  type        = string
}

# YouTube Data API キー
variable "youtube_api_key" {
  description = "YouTube Data API v3を利用するためのAPIキー"
  type        = string
  sensitive   = true # ログや出力に表示されないよう機密データとして扱う
}