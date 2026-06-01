# ==============================================================================
# YouTube動画取得関数 (v2 - Pub/Subトリガー)
# ==============================================================================
# 概要: YouTubeから最新の動画情報を定期的に取得しFirestoreに保存する関数
#
# ADR-009: 関数本体（spec/source/runtime/env）は GitHub Actions が正本（deploy-functions.yml）。
# Terraform は SA / Pub/Sub / Scheduler / IAM の土台のみを管理し、
# google_cloudfunctions2_function リソースは持たない（checkDataIntegrity 方式に統一）。
# これにより live(540s/3) ↔ config(120s/1) の二重管理 drift を解消する（SPR-92）。
# ==============================================================================

locals {
  youtube_function_name = "fetchYouTubeVideos"

  # この関数が必要とする環境変数（シークレット）のリスト
  youtube_secrets = [
    "YOUTUBE_API_KEY"
  ]
}

# YouTube動画取得関数 (Gen2) は GitHub Actions でデプロイされるため、
# Terraform では google_cloudfunctions2_function リソースを管理しない（ADR-009 / SPR-92）。
#
# spec の正本（deploy-functions.yml の gcloud functions deploy）:
#   runtime=nodejs24 / memory=256Mi / timeout=540s / max-instances=3
#   entry-point=fetchYouTubeVideos / trigger-topic=youtube-video-fetch-trigger
#
# デプロイ手順:
#   1. terraform apply で SA / Pub/Sub トピック / Scheduler / IAM を作成
#   2. GitHub Actions（deploy-functions.yml）が関数本体をデプロイ
#
# resource "google_cloudfunctions2_function" "fetch_youtube_videos" {
#   # GitHub Actions によるデプロイとの競合を避けるためコメントアウト（ADR-009 / SPR-92）。
# }

# YouTube動画取得関数用のサービスアカウントにシークレットアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "youtube_video_secret_accessor" {
  for_each = toset(local.youtube_secrets)

  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets[each.value].secret_id
  role      = google_project_iam_custom_role.secret_manager_accessor_role.id
  member    = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.fetch_youtube_videos_sa,
    google_project_iam_custom_role.secret_manager_accessor_role
  ]
}

# Cloud Function のリソース情報を出力
# 関数は GitHub Actions でデプロイされるため、名前のみ出力（checkDataIntegrity 方式）
output "fetch_youtube_videos_function_info" {
  value = {
    name = local.youtube_function_name
    note = "Function will be deployed via GitHub Actions (ADR-009)"
  }
  description = "YouTube動画取得関数の情報"
}
