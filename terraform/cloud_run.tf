/**
 * Cloud Run設定
 *
 * Next.js 15 App RouterアプリケーションをCloud Runにデプロイする設定
 */

# Cloud Runサービス
resource "google_cloud_run_v2_service" "nextjs_app" {
  provider = google

  name     = "suzumina-click-web"
  location = var.region
  
  description = "suzumina.click Next.js 15 Web Application"

  template {
    # スケーリング設定
    scaling {
      min_instance_count = 0  # コールドスタート許可（コスト最適化）
      max_instance_count = 10 # 最大10インスタンス
    }

    # コンテナ設定
    containers {
      # Artifact Registryのイメージを参照
      image = "${var.region}-docker.pkg.dev/${local.project_id}/suzumina-click/web:latest"

      # リソース制限
      resources {
        limits = {
          cpu    = "1000m"   # 1 vCPU
          memory = "2Gi"     # 2GB RAM
        }
        cpu_idle = true      # アイドル時のCPU制限
        startup_cpu_boost = true # 起動時のCPUブースト
      }

      # ポート設定
      ports {
        name           = "http1"
        container_port = 8080
      }

      # 環境変数
      env {
        name  = "NODE_ENV"
        value = "production"
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

      # ヘルスチェック設定
      startup_probe {
        http_get {
          path = "/api/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 3
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
    timeout = "300s"  # 5分

    # セッション親和性（なし - ステートレス）
    session_affinity = false
  }

  # トラフィック設定（全トラフィックを最新リビジョンに）
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_service_account.cloud_run_service_account
  ]
}

# Cloud Run用サービスアカウント
resource "google_service_account" "cloud_run_service_account" {
  provider = google

  account_id   = "cloud-run-nextjs"
  display_name = "Cloud Run Next.js Service Account"
  description  = "Next.js アプリケーションがFirestoreにアクセスするためのサービスアカウント"
}

# Firestore読み取り権限
resource "google_project_iam_member" "cloud_run_firestore_user" {
  provider = google

  project = local.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# Cloud Storage読み取り権限（音声ファイル用）
resource "google_project_iam_member" "cloud_run_storage_viewer" {
  provider = google

  project = local.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.cloud_run_service_account.email}"
}

# Cloud Run Invoker権限（パブリックアクセス）
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
  count    = var.custom_domain != "" ? 1 : 0

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