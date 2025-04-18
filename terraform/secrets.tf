# Discord Client ID Secret
resource "google_secret_manager_secret" "discord_client_id" {
  project   = var.gcp_project_id
  secret_id = "DISCORD_CLIENT_ID"

  replication {
    user_managed {
      replicas { # Define 'replicas' as a block
        location = "asia-northeast1" # Specify location within the 'replicas' block
      }
    }
  }

  depends_on = [google_project_service.secretmanager]
}

# Discord Client Secret Secret
resource "google_secret_manager_secret" "discord_client_secret" {
  project   = var.gcp_project_id
  secret_id = "DISCORD_CLIENT_SECRET"

  replication {
    user_managed {
      replicas {
        location = "asia-northeast1"
      }
    }
  }
  depends_on = [google_project_service.secretmanager]
}

# Discord Redirect URI Secret
resource "google_secret_manager_secret" "discord_redirect_uri" {
  project   = var.gcp_project_id
  secret_id = "DISCORD_REDIRECT_URI"

  replication {
    user_managed {
      replicas {
        location = "asia-northeast1"
      }
    }
  }
  depends_on = [google_project_service.secretmanager]
}

# Discord Target Guild ID Secret
resource "google_secret_manager_secret" "discord_target_guild_id" {
  project   = var.gcp_project_id
  secret_id = "DISCORD_TARGET_GUILD_ID"

  replication {
    user_managed {
      replicas {
        location = "asia-northeast1"
      }
    }
  }
  depends_on = [google_project_service.secretmanager]
}

# YouTube Data API Key Secret
resource "google_secret_manager_secret" "youtube_api_key" {
  project   = var.gcp_project_id
  secret_id = "YOUTUBE_API_KEY" # Use the planned secret ID

  replication {
    user_managed {
      replicas {
        location = "asia-northeast1" # Match existing replication settings
      }
    }
  }
  depends_on = [google_project_service.secretmanager]
}


# TODO: 関数実行サービスアカウントに Secret Manager へのアクセス権限を付与
# data "google_compute_default_service_account" "default" {}
# resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor" {
#   project   = google_secret_manager_secret.discord_client_id.project
#   secret_id = google_secret_manager_secret.discord_client_id.secret_id
#   role      = "roles/secretmanager.secretAccessor"
#   member    = "serviceAccount:${data.google_compute_default_service_account.default.email}"
# }
# ... 他のシークレットも同様 ...