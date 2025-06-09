# GCPプロジェクト関連の識別子
# GCPプロジェクトID
variable "gcp_project_id" {
  description = "Google Cloud Projectのプロジェクトid"
  type        = string
}

# GCPプロジェクト番号
variable "project_number" {
  description = "Google Cloud Projectのプロジェクト番号（コンソールのプロジェクト情報から確認可能）"
  type        = string
}

# GCPリージョン
variable "region" {
  description = "Google Cloudのリージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "zone" {
  description = "Google Cloudのゾーン"
  type        = string
  default     = "asia-northeast1-a"
}

# GCPサービスアカウントJSONファイルのパス
variable "credentials_file" {
  description = "GCPのサービスアカウントキーファイルのパス"
  type        = string
  default     = "service-account-key.json"
}

variable "firebase_project" {
  description = "Firebase プロジェクト名"
  type        = string
}

# YouTube API関連
variable "youtube_api_key" {
  description = "YouTubeデータAPI用のAPIキー"
  type        = string
  sensitive   = true
}


# 環境識別子
variable "environment" {
  description = "環境の識別子（production, staging, development等）"
  type        = string
  default     = "development"
}