# Cloud Run サービスの定義
resource "google_cloud_run_service" "nextjs_app" {
  name     = "suzumina-click-nextjs-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/suzumina-click-nextjs-app:latest"
        
        # リソース制限を設定
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        
        # 環境変数の設定
        dynamic "env" {
          for_each = var.firebase_config
          content {
            name  = "FIREBASE_${env.key}"
            value = env.value
          }
        }
        
        # その他の環境変数
        dynamic "env" {
          for_each = var.nextjs_env_vars
          content {
            name  = env.key
            value = env.value
          }
        }
        
        # ポート設定
        ports {
          container_port = 8080
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # 評価環境は必要に応じて自動スケーリングを無効化できます
  autogenerate_revision_name = true
}

# 公開アクセス設定（評価環境はパブリックアクセス可能）
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.nextjs_app.name
  location = google_cloud_run_service.nextjs_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}