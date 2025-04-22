# Cloud Run サービスの定義
resource "google_cloud_run_service" "nextjs_app" {
  name     = "suzumina-click-nextjs-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/suzumina-click-nextjs-app:latest"
        
        # リソース制限を設定
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        
        # 環境変数の設定
        # Firebase関連の環境変数
        dynamic "env" {
          for_each = var.firebase_config
          content {
            name  = "FIREBASE_${env.key}"
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

  # トラフィック設定
  traffic {
    percent         = 100
    latest_revision = true
  }

  # 依存関係の管理（他のリソースが必要な場合）
  depends_on = [
    # 必要なリソースがあればここに追加
  ]
}

# 公開アクセス設定（すべてのユーザーに公開）
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.nextjs_app.name
  location = google_cloud_run_service.nextjs_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"  # 公開アクセスを許可
}

# Cloud Runサービスの出力値
output "nextjs_app_url" {
  value       = google_cloud_run_service.nextjs_app.status[0].url
  description = "Next.jsアプリケーションのURL"
}

# 注意: このファイルは最初にCloud BuildトリガーとIAM設定を適用した後、
# コンテナイメージをビルドしてから再度コメントを外して適用してください。