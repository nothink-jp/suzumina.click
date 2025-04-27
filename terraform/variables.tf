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

# Firebase設定
variable "firebase_config" {
  description = "FirebaseクライアントSDK設定"
  type        = map(string)
  sensitive   = true
  default     = {}
}

# Discord設定
variable "discord_client_id" {
  description = "Discord OAuth Client ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "discord_client_secret" {
  description = "Discord OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "discord_redirect_uri" {
  description = "Discord OAuth Redirect URI"
  type        = string
  default     = ""
}

variable "discord_target_guild_id" {
  description = "Discord Target Guild ID"
  type        = string
  sensitive   = true
  default     = ""
}

# アカウント情報
variable "billing_account_id" {
  description = "Google Cloud Platform 請求先アカウントID"
  type        = string
}

# 予算設定
variable "monthly_budget_amount" {
  description = "月間予算金額（JPY）"
  type        = string
  default     = "1000"
}

variable "enable_budget" {
  description = "予算設定を有効にするかどうか"
  type        = bool
  default     = false
}

# アラート通知メール
variable "alert_email_address" {
  description = "アラート通知先メールアドレス"
  type        = string
}

# 環境識別子
variable "environment" {
  description = "環境の識別子（production, staging, development等）"
  type        = string
  default     = "development"
}

# 環境変数と秘密情報
variable "env_variables" {
  description = "Cloud Run サービスの環境変数"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret Managerに保存する秘密情報"
  type        = map(string)
  sensitive   = true
  default     = {}
}