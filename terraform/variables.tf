# ==========================================================
# Terraform変数定義
# ==========================================================

variable "gcp_project_id" {
  description = "Google Cloud プロジェクトID"
  type        = string
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
# 音声処理機能用変数
# ==========================================================

variable "audio_bucket_lifecycle_days" {
  description = "音声ファイルの自動削除までの日数"
  type        = number
  default     = 365
}

variable "audio_processing_max_concurrent" {
  description = "音声処理の最大同時実行数"
  type        = number
  default     = 3
}

variable "audio_processing_timeout" {
  description = "音声処理のタイムアウト（秒）"
  type        = number
  default     = 3600
}

variable "cloud_run_jobs_cpu" {
  description = "Cloud Run JobsのCPU設定"
  type        = string
  default     = "4"
}

variable "cloud_run_jobs_memory" {
  description = "Cloud Run Jobsのメモリ設定"
  type        = string
  default     = "16Gi"
}

# ==========================================================
# Cloud Tasks設定用変数
# ==========================================================

variable "audio_queue_max_dispatches_per_second" {
  description = "音声処理キューの最大実行レート（秒間）"
  type        = number
  default     = 1.0
}

variable "audio_queue_max_concurrent_dispatches" {
  description = "音声処理キューの最大同時実行数"
  type        = number
  default     = 3
}

variable "audio_queue_max_retries" {
  description = "音声処理タスクの最大リトライ回数"
  type        = number
  default     = 3
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
  description = "環境名（development, staging, production）"
  type        = string
  default     = "development"
}