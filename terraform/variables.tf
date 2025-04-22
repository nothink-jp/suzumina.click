# GCPプロジェクトID
variable "gcp_project_id" {
  description = "GCPプロジェクトのID（例：'my-project-123'）"
  type        = string
}

# プロジェクトID（互換性のため）
variable "project_id" {
  description = "GCPプロジェクトのID（互換性のため、gcp_project_idと同じ）"
  type        = string
  default     = ""
}

# GCPプロジェクト番号
variable "project_number" {
  description = "GCPプロジェクトの番号（例：'123456789'）"
  type        = string
}

# GCPリージョン
variable "region" {
  description = "GCPリソースをデプロイするリージョン"
  type        = string
  default     = "asia-northeast1"  # 東京リージョン
}

# Firebase設定
variable "firebase_config" {
  description = "Firebaseの各種設定パラメータ"
  type        = map(string)
  default     = {}
}

# YouTube Data API キー
variable "youtube_api_key" {
  description = "YouTube Data API v3を利用するためのAPIキー"
  type        = string
  sensitive   = true # ログや出力に表示されないよう機密データとして扱う
}