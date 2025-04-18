# Data source to get project details like project number
data "google_project" "project" {
  project_id = var.gcp_project_id
}

# ------------------------------------------------------------------------------
# Service Account and IAM for discordAuthCallback Function
# ------------------------------------------------------------------------------

# Cloud Function 用のサービスアカウント (Discord Auth)
resource "google_service_account" "discord_auth_callback_sa" { # Renamed for clarity
  project      = var.gcp_project_id
  account_id   = "discord-auth-callback-sa"
  display_name = "Service Account for Discord Auth Callback Function"
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_CLIENT_ID)
resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor" {
  project   = google_secret_manager_secret.discord_client_id.project
  secret_id = google_secret_manager_secret.discord_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # Updated reference

  # シークレットとサービスアカウントが作成されてから実行
  depends_on = [
    google_secret_manager_secret.discord_client_id,
    google_service_account.discord_auth_callback_sa, # Updated reference
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_CLIENT_SECRET)
resource "google_secret_manager_secret_iam_member" "discord_client_secret_accessor" {
  project   = google_secret_manager_secret.discord_client_secret.project
  secret_id = google_secret_manager_secret.discord_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # Updated reference

  depends_on = [
    google_secret_manager_secret.discord_client_secret,
    google_service_account.discord_auth_callback_sa, # Updated reference
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_REDIRECT_URI)
resource "google_secret_manager_secret_iam_member" "discord_redirect_uri_accessor" {
  project   = google_secret_manager_secret.discord_redirect_uri.project
  secret_id = google_secret_manager_secret.discord_redirect_uri.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # Updated reference

  depends_on = [
    google_secret_manager_secret.discord_redirect_uri,
    google_service_account.discord_auth_callback_sa, # Updated reference
  ]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (DISCORD_TARGET_GUILD_ID)
resource "google_secret_manager_secret_iam_member" "discord_target_guild_id_accessor" {
  project   = google_secret_manager_secret.discord_target_guild_id.project
  secret_id = google_secret_manager_secret.discord_target_guild_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # Updated reference

  depends_on = [
    google_secret_manager_secret.discord_target_guild_id,
    google_service_account.discord_auth_callback_sa, # Updated reference
  ]
}


# ------------------------------------------------------------------------------
# Service Account and IAM for fetchYouTubeVideos Function
# ------------------------------------------------------------------------------

# Cloud Function 用のサービスアカウント (YouTube Fetch)
resource "google_service_account" "fetch_youtube_videos_sa" {
  project      = var.gcp_project_id
  account_id   = "fetch-youtube-videos-sa" # New service account ID
  display_name = "Service Account for Fetch YouTube Videos Function"
}

# サービスアカウントに Firestore User ロールを付与
resource "google_project_iam_member" "fetch_youtube_videos_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user" # Role for Firestore read/write access
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}

# サービスアカウントに Secret Manager Secret Accessor ロールを付与 (YOUTUBE_API_KEY)
resource "google_secret_manager_secret_iam_member" "youtube_api_key_accessor" {
  project   = google_secret_manager_secret.youtube_api_key.project
  secret_id = google_secret_manager_secret.youtube_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [
    google_secret_manager_secret.youtube_api_key,
    google_service_account.fetch_youtube_videos_sa,
  ]
}

# サービスアカウントに Log Writer ロールを付与
resource "google_project_iam_member" "fetch_youtube_videos_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter" # Role for writing logs
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}

# ADDED: Grant Run Invoker role to the function's own service account
resource "google_project_iam_member" "fetch_youtube_videos_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}


# ------------------------------------------------------------------------------
# IAM Bindings for Service Interactions (Scheduler -> Pub/Sub -> Functions)
# ------------------------------------------------------------------------------

# Grant Cloud Scheduler Service Agent the Pub/Sub Publisher role on the topic
resource "google_pubsub_topic_iam_member" "scheduler_pubsub_publisher" {
  project = google_pubsub_topic.youtube_video_fetch_trigger.project
  topic   = google_pubsub_topic.youtube_video_fetch_trigger.name
  role    = "roles/pubsub.publisher"
  # Construct the service agent email using the project number from the data source
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [
    google_pubsub_topic.youtube_video_fetch_trigger,
    data.google_project.project,
  ]
}

# Grant Pub/Sub Service Agent the Token Creator role on the function's service account
# This allows Pub/Sub to create OIDC tokens for authenticated function invocation via Eventarc
resource "google_service_account_iam_member" "pubsub_token_creator" {
  service_account_id = google_service_account.fetch_youtube_videos_sa.name # The SA the function runs as
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com" # Pub/Sub SA

  depends_on = [
    google_service_account.fetch_youtube_videos_sa,
    data.google_project.project,
  ]
}

# Grant Eventarc Service Agent the Event Receiver role on the project
# This allows Eventarc to deliver events to the function's service account
resource "google_project_iam_member" "eventarc_event_receiver" { # Changed resource type
  project = var.gcp_project_id # Bind to project level
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-eventarc.iam.gserviceaccount.com" # Eventarc SA

  depends_on = [
    # google_service_account.fetch_youtube_videos_sa, # No longer depends on function SA directly
    data.google_project.project,
  ]
}

# Grant Eventarc Service Agent the Run Invoker role on the project (or ideally, restricted to the specific function's Run service)
# This allows Eventarc to invoke the underlying Cloud Run service for the function
# Note: Binding to the project level is broader than necessary but simpler for this example.
# For stricter security, bind to the specific Cloud Run service associated with the function.
resource "google_project_iam_member" "eventarc_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-eventarc.iam.gserviceaccount.com" # Eventarc SA

  depends_on = [
    data.google_project.project,
    # google_cloudfunctions2_function.fetch_youtube_videos # Ensure function (and its Run service) exists
  ]
}

# Note: The binding for Pub/Sub -> Cloud Functions v2 (Eventarc trigger)
# is typically handled automatically by the google_cloudfunctions2_function resource
# when the event_trigger block is defined. These explicit bindings are added for robustness.