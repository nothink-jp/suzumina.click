# GCPプロジェクト関連の識別子
# GCPプロジェクトID
variable "gcp_project_id" {
  description = "GCPプロジェクトのID（例：'my-project-123'）"
  type        = string
}

# GCPプロジェクト番号（プロジェクトIDとは異なる値）
variable "project_number" {
  description = "GCPプロジェクトの番号（例：'123456789'）。プロジェクトIDとは異なる数値形式の識別子で、特定のIAM設定などで必要。"
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

# Discord OAuth設定
# Discord Developer Portalから取得できる情報
variable "discord_client_id" {
  description = "Discord OAuth認証で使用するクライアントID"
  type        = string
  sensitive   = true
}

variable "discord_client_secret" {
  description = "Discord OAuth認証で使用するクライアントシークレット"
  type        = string
  sensitive   = true
}

variable "discord_redirect_uri" {
  description = "Discord OAuth認証後のリダイレクト先URI"
  type        = string
}