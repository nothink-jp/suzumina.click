# Cloud Function 用のサービスアカウント
resource "google_service_account" "function_identity" {
  project      = var.gcp_project_id
  account_id   = "discord-auth-callback-sa" # わかりやすいアカウント ID
  display_name = "Service Account for Discord Auth Callback Function"
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_CLIENT_ID)
resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor" {
  project   = google_secret_manager_secret.discord_client_id.project
  secret_id = google_secret_manager_secret.discord_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_identity.email}"

  # シークレットとサービスアカウントが作成されてから実行
  depends_on = [
    google_secret_manager_secret.discord_client_id,
    google_service_account.function_identity,
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_CLIENT_SECRET)
resource "google_secret_manager_secret_iam_member" "discord_client_secret_accessor" {
  project   = google_secret_manager_secret.discord_client_secret.project
  secret_id = google_secret_manager_secret.discord_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_identity.email}"

  depends_on = [
    google_secret_manager_secret.discord_client_secret,
    google_service_account.function_identity,
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_REDIRECT_URI)
resource "google_secret_manager_secret_iam_member" "discord_redirect_uri_accessor" {
  project   = google_secret_manager_secret.discord_redirect_uri.project
  secret_id = google_secret_manager_secret.discord_redirect_uri.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_identity.email}"

  depends_on = [
    google_secret_manager_secret.discord_redirect_uri,
    google_service_account.function_identity,
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_TARGET_GUILD_ID)
resource "google_secret_manager_secret_iam_member" "discord_target_guild_id_accessor" {
  project   = google_secret_manager_secret.discord_target_guild_id.project
  secret_id = google_secret_manager_secret.discord_target_guild_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_identity.email}"

  depends_on = [
    google_secret_manager_secret.discord_target_guild_id,
    google_service_account.function_identity,
  ]
}