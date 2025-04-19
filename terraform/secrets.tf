# Discord Client ID シークレット
# Discordアプリケーションの認証に使用するクライアントID
resource "google_secret_manager_secret" "discord_client_id" {
  project   = var.gcp_project_id
  secret_id = "DISCORD_CLIENT_ID"

  replication {
    user_managed {
      replicas { # レプリカをブロックとして定義
        location = "asia-northeast1" # レプリカの地理的位置を指定（東京リージョン）
      }
    }
  }

  depends_on = [google_project_service.secretmanager]
}

# Discord Client Secret シークレット
# Discordアプリケーションの認証に使用するクライアントシークレット
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

# Discord リダイレクトURI シークレット
# OAuth2認証成功後のリダイレクト先URL
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

# Discord ターゲットギルドID シークレット
# 認証対象となるDiscordサーバー（ギルド）のID
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

# YouTube Data API キー シークレット
# YouTubeデータ取得に使用するAPIキー
resource "google_secret_manager_secret" "youtube_api_key" {
  project   = var.gcp_project_id
  secret_id = "YOUTUBE_API_KEY"

  replication {
    user_managed {
      replicas {
        location = "asia-northeast1" # 既存の設定と合わせる
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