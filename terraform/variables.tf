# ==========================================================
# Terraform変数定義
# ==========================================================

variable "gcp_project_id" {
  description = "Google Cloud プロジェクトID"
  type        = string
}


variable "domain_name" {
  description = "ドメイン名"
  type        = string
  default     = "suzumina.click"
}

variable "region" {
  description = "Google Cloud リージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "zone" {
  description = "Google Cloud ゾーン"
  type        = string
  default     = "asia-northeast1-a"
}


# ==========================================================
# プロジェクト設定用変数
# ==========================================================

variable "project_number" {
  description = "Google Cloud プロジェクト番号"
  type        = string
}

variable "youtube_api_key" {
  description = "YouTube Data API キー"
  type        = string
  sensitive   = true
}


variable "environment" {
  description = "環境名（staging, production）"
  type        = string
  default     = "staging"
  
  validation {
    condition = contains(["staging", "production"], var.environment)
    error_message = "環境は staging または production である必要があります。"
  }
}

# ==========================================================
# Cloud Run設定用変数
# ==========================================================

variable "custom_domain" {
  description = "Cloud Runにマッピングするカスタムドメイン（空文字列の場合はマッピングしない）"
  type        = string
  default     = ""
  
  validation {
    condition = var.custom_domain == "" || can(regex("^[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9]*\\.[a-zA-Z]{2,}$", var.custom_domain))
    error_message = "custom_domain は有効なドメイン名である必要があります。"
  }
}
variable "artifact_registry_repository_id" {
  description = "Artifact RegistryのリポジトリID"
  type        = string
  default     = "suzumina-click"
}
variable "cloud_run_service_name" {
  description = "Cloud Run サービス名"
  type        = string
  default     = "suzumina-click-web"
}

# ==========================================================
# 監視・アラート設定用変数
# ==========================================================

variable "admin_email" {
  description = "監視アラート通知先の管理者メールアドレス"
  type        = string
}


# ==========================================================
# 予算・コスト管理用変数
# ==========================================================

variable "budget_amount" {
  description = "月次予算アラートの金額（USD）"
  type        = number
  default     = 50  # 約5000円相当（個人開発向け）
}

variable "budget_threshold_percent" {
  description = "予算アラートの閾値（パーセント）"
  type        = list(number)
  default     = [50, 80, 100]
}

# ==========================================================
# DLsite機能設定変数
# ==========================================================

variable "enable_detailed_scraping" {
  description = "DLsite詳細スクレイピング機能の有効化"
  type        = bool
  default     = true
}

# ==========================================================
# 認証関連変数
# ==========================================================

variable "discord_client_id" {
  description = "Discord OAuth Application Client ID"
  type        = string
  sensitive   = false  # Client IDは公開情報のためsensitiveではない
}

variable "discord_client_secret" {
  description = "Discord OAuth Application Client Secret"
  type        = string
  sensitive   = true
}

variable "discord_bot_token" {
  description = "Discord Bot Token for guild member verification (optional)"
  type        = string
  sensitive   = true
  default     = ""  # オプション
}

variable "nextauth_secret" {
  description = "NextAuth.js secret for JWT encryption (generate with: openssl rand -base64 32)"
  type        = string
  sensitive   = true
}

variable "suzumina_guild_id" {
  description = "すずみなふぁみりー Discord Guild ID"
  type        = string
  default     = "959095494456537158"
  sensitive   = false  # Guild IDは公開情報
}

# ==========================================================
# Google Analytics 設定変数
# ==========================================================

variable "google_analytics_measurement_id" {
  description = "Google Analytics 4 Measurement ID"
  type        = string
  default     = "G-9SYZ48LBPH"
  sensitive   = false  # Measurement IDは公開情報
}

variable "google_tag_manager_id" {
  description = "Google Tag Manager Container ID"
  type        = string
  default     = "GTM-W7QT5PCR"
  sensitive   = false  # GTM IDは公開情報
}

variable "google_adsense_client_id" {
  description = "Google AdSense Publisher Client ID"
  type        = string
  default     = "ca-pub-8077945848616354"
  sensitive   = false  # AdSense Client IDは公開情報
}

