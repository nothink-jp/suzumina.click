/**
 * Cloud Run設定
 *
 * Next.js App RouterアプリケーションをCloud Runにデプロイする設定
 */

# 現在稼働中の Cloud Run サービスを参照し、GitHub Actions がデプロイした
# 「実体の image」を読み取る（SPR-67 恒久対策）。
#
# 背景: GitHub Actions は `gcloud run deploy --image web:<sha>` で image を更新するが、
# 以前は lifecycle.ignore_changes で image を無視していたため state に古い SHA が残り、
# labels 等の差分契機で revision が新規作成されると、cleanup policy で既に削除済みの
# image を参照して起動失敗していた（"Image ... not found"）。
# この data source で実体の image を毎回読み取り resource に渡すことで、
# Terraform 側の image を常に live へ追従させ、古い SHA が state に残らないようにする。
#
# 初回 apply / DR 時（サービス未作成）は var.cloud_run_bootstrap = true にして
# data source の参照を無効化し、:latest で起動する。
data "google_cloud_run_v2_service" "current" {
  count = var.cloud_run_bootstrap ? 0 : 1

  provider = google
  name     = var.cloud_run_service_name
  location = var.region
}

locals {
  # 通常運用では live の image を踏襲し、bootstrap（count=0）時は :latest にフォールバックする。
  # splat + one() で count=0 を null 化してフォールバックさせ、count=1 だが構造が想定外の
  # 場合は黙殺せずエラーにする（try() のような握り潰しを避ける）。
  cloud_run_image = coalesce(
    one(data.google_cloud_run_v2_service.current[*].template[0].containers[0].image),
    "${var.region}-docker.pkg.dev/${local.project_id}/${var.artifact_registry_repository_id}/web:latest"
  )
}

# Cloud Runサービス（全環境で有効）
resource "google_cloud_run_v2_service" "nextjs_app" {

  provider = google

  name     = var.cloud_run_service_name
  location = var.region

  description = "suzumina.click Next.js Web Application"

  labels = local.common_labels


  # Note: デフォルトURLアクセス制御はアプリケーションレベルで実装

  template {
    # スケーリング設定（環境別）
    scaling {
      min_instance_count = local.current_env.cloud_run_min_instances
      max_instance_count = local.current_env.cloud_run_max_instances
    }

    max_instance_request_concurrency = 50

    # コンテナ設定
    containers {
      # 稼働中サービスの image を踏襲する（SPR-67: 古い SHA の混入防止）。
      # 実体の追跡は data.google_cloud_run_v2_service.current 経由（local.cloud_run_image）。
      image = local.cloud_run_image

      # リソース制限（環境別・コスト最適化）
      resources {
        limits = {
          cpu    = local.current_env.cloud_run_cpu
          memory = local.current_env.cloud_run_memory
        }
        cpu_idle          = local.current_env.cloud_run_cpu_idle
        startup_cpu_boost = var.environment == "production" # 本番のみCPUブースト
      }

      # ポート設定
      ports {
        name           = "http1"
        container_port = 8080
      }

      # 環境変数
      env {
        name  = "NODE_ENV"
        value = var.environment == "development" ? "development" : "production"
      }


      # Firestore設定（プロジェクトIDを環境変数で設定）
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = local.project_id
      }

      # Next.js telemetry無効化
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }

      # better-auth のベース URL（SPR-158 で NextAuth から移行）
      # 注: env は lifecycle.ignore_changes 対象で、実値は GitHub Actions の gcloud deploy が管理する。
      env {
        name  = "BETTER_AUTH_URL"
        value = var.environment == "production" && var.custom_domain != "" ? "https://${var.custom_domain}" : "auto"
      }

      # Discord OAuth Client ID (Secret Managerから取得)
      env {
        name = "DISCORD_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["DISCORD_CLIENT_ID"].secret_id
            version = "latest"
          }
        }
      }

      # Discord OAuth Client Secret (Secret Managerから取得)
      env {
        name = "DISCORD_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["DISCORD_CLIENT_SECRET"].secret_id
            version = "latest"
          }
        }
      }


      # better-auth Secret（SPR-158: 既存の NEXTAUTH_SECRET の値を流用し env 名のみ変更）
      env {
        name = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["NEXTAUTH_SECRET"].secret_id
            version = "latest"
          }
        }
      }

      # YouTube API Key (既存のSecret Managerから取得)
      env {
        name = "YOUTUBE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["YOUTUBE_API_KEY"].secret_id
            version = "latest"
          }
        }
      }

      # すずみなふぁみりー Guild ID
      env {
        name  = "SUZUMINA_GUILD_ID"
        value = var.suzumina_guild_id
      }

      # Google Analytics Measurement ID
      env {
        name  = "NEXT_PUBLIC_GA_MEASUREMENT_ID"
        value = var.google_analytics_measurement_id
      }

      # Google Tag Manager ID
      env {
        name  = "NEXT_PUBLIC_GTM_ID"
        value = var.google_tag_manager_id
      }

      # Resend API Key (Secret Managerから取得)
      env {
        name = "RESEND_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["RESEND_API_KEY"].secret_id
            version = "latest"
          }
        }
      }

      # Contact Email Recipients (Secret Managerから取得)
      env {
        name = "CONTACT_EMAIL_RECIPIENTS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["CONTACT_EMAIL_RECIPIENTS"].secret_id
            version = "latest"
          }
        }
      }

      # 許可されたホスト名（デフォルトURL制御用）
      env {
        name  = "ALLOWED_HOSTS"
        value = var.environment == "production" && var.custom_domain != "" ? var.custom_domain : ""
      }

      # ヘルスチェック設定
      startup_probe {
        http_get {
          path = "/api/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 2
        period_seconds        = 5
        failure_threshold     = 5
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
    }

    # サービスアカウント（Firestoreアクセス用）
    service_account = google_service_account.cloud_run_service_account.email

    # タイムアウト設定
    timeout = "300s" # 5分

    # セッション親和性（なし - ステートレス）
    session_affinity = false
  }

  # トラフィック設定（全トラフィックを最新リビジョンに）
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  # 環境変数は GitHub Actions の `gcloud run deploy --set-env-vars/--set-secrets` が
  # 管理するため Terraform は無視する。
  # client / client_version は gcloud run deploy が毎回付与する識別子メタデータで、
  # Terraform config では未設定（null）。恒久的な "gcloud" -> null 差分を避けるため無視する。
  # image は ignore せず data source で live を追従する（SPR-67 恒久対策）。
  # 注意: refresh を伴わない apply（-refresh=false）は state を古くするため使用しない。
  lifecycle {
    ignore_changes = [
      template[0].containers[0].env,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_service_account.cloud_run_service_account,
    google_secret_manager_secret.secrets
  ]
}

# Cloud Run用サービスアカウント（全環境で有効）
resource "google_service_account" "cloud_run_service_account" {

  provider = google

  account_id   = "cloud-run-nextjs"
  display_name = "Cloud Run Next.js Service Account"
  description  = "Next.js アプリケーションがFirestoreにアクセスするためのサービスアカウント"
}

# Firestore読み取り権限（全環境で有効）
resource "google_project_iam_member" "cloud_run_firestore_user" {
  provider = google

  project = local.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# Secret Manager アクセス権限（全環境で有効）
resource "google_project_iam_member" "cloud_run_secret_manager_accessor" {
  provider = google

  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}


# Cloud Run Invoker権限（パブリックアクセス）（全環境で有効）
resource "google_cloud_run_v2_service_iam_binding" "public_access" {
  provider = google

  location = google_cloud_run_v2_service.nextjs_app.location
  name     = google_cloud_run_v2_service.nextjs_app.name
  role     = "roles/run.invoker"

  members = [
    "allUsers"
  ]

  depends_on = [google_cloud_run_v2_service.nextjs_app]
}


# カスタムドメイン用のドメインマッピング（オプション）
resource "google_cloud_run_domain_mapping" "custom_domain" {
  provider = google
  count    = local.current_env.enable_custom_domain && var.custom_domain != "" ? 1 : 0

  location = var.region
  name     = var.custom_domain

  metadata {
    namespace = local.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.nextjs_app.name
  }
}

# Cloud Run URL出力
output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.nextjs_app.uri
}

output "cloud_run_service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run_service_account.email
}

# デバッグ用出力
output "better_auth_url_debug" {
  description = "better-auth URL configuration for debugging"
  value = {
    environment     = var.environment
    custom_domain   = var.custom_domain
    better_auth_url = var.environment == "production" && var.custom_domain != "" ? "https://${var.custom_domain}" : "auto"
  }
  sensitive = false
}