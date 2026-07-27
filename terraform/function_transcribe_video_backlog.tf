# ==============================================================================
# 発話文字起こしバックログ機能（SPR-293）
# ==============================================================================
# 概要: 配信アーカイブの発話文字起こし（videos/{id}/transcriptChunks）を
# チャンク（10分）単位で定期的に埋める。作成画面の「セリフで探す」の供給源。
# - チェックポイントはチャンク doc の存在（冪等・再実行安全）
# - 1実行の生成量は TRANSCRIBE_CHUNKS_PER_RUN（既定12）と経過時間で打ち切り
#   → 2時間毎 × 12チャンク ≒ 1日あたり動画24時間分のペース（コスト制御）
# - 関数 spec（runtime / memory / timeout / secret）の正本は GitHub Actions
#   （deploy-functions.yml）。ADR-009 原則2: terraform はインフラのみを持つ。
# ==============================================================================

locals {
  transcribe_video_backlog_function_name = "transcribeVideoBacklog"
}

# 文字起こしバックログ用のPub/Subトピック
resource "google_pubsub_topic" "transcribe_video_backlog_trigger" {
  project = var.gcp_project_id
  name    = "transcribe-video-backlog-trigger"

  labels = {
    environment = var.environment
    function    = "transcribe-video-backlog"
    managed-by  = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# 文字起こしバックログ用のCloud Scheduler（2時間毎）
# :17 は毎時 :00/:03 に走る既存ジョブ（YouTube/DLsite）との同時起動を避けるオフセット
resource "google_cloud_scheduler_job" "transcribe_video_backlog_bi_hourly" {
  project = var.gcp_project_id
  region  = var.region
  name    = "transcribe-video-backlog-bi-hourly"

  description = "発話文字起こしバックログ処理（2時間毎）"
  schedule    = "17 */2 * * *"
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.transcribe_video_backlog_trigger.id
    data = base64encode(jsonencode({
      type        = "transcribe_video_backlog"
      description = "発話文字起こしバックログの定期処理"
    }))
  }

  depends_on = [
    google_pubsub_topic.transcribe_video_backlog_trigger,
  ]
}

# ------------------------------------------------------------------------------
# transcribeVideoBacklog関数用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

resource "google_service_account" "transcribe_video_backlog_sa" {
  project      = var.gcp_project_id
  account_id   = "transcribe-video-backlog-sa"
  display_name = "発話文字起こしバックログ関数用サービスアカウント"
}

# Firestore 読み書き（videos の走査と transcriptChunks の保存）
resource "google_project_iam_member" "transcribe_video_backlog_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.transcribe_video_backlog_sa.email}"

  depends_on = [google_service_account.transcribe_video_backlog_sa]
}

# GEMINI_API_KEY シークレットへのアクセス権限
# （関数への環境変数マウントは deploy-functions.yml の --set-secrets が正本）
resource "google_secret_manager_secret_iam_member" "transcribe_video_backlog_gemini_key_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["GEMINI_API_KEY"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.transcribe_video_backlog_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.transcribe_video_backlog_sa,
  ]
}

# ログ書き込み
resource "google_project_iam_member" "transcribe_video_backlog_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.transcribe_video_backlog_sa.email}"

  depends_on = [google_service_account.transcribe_video_backlog_sa]
}

# Gen2（Cloud Run 基盤）関数の実行
resource "google_project_iam_member" "transcribe_video_backlog_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.transcribe_video_backlog_sa.email}"

  depends_on = [google_service_account.transcribe_video_backlog_sa]
}
