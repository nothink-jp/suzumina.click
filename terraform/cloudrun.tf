# ==============================================================================
# Cloud Run サービス設定
# ==============================================================================
# 概要: Next.jsアプリケーションのホスティング用Cloud Runサービス
# ==============================================================================

# Cloud Run サービスの設定
locals {
  cloudrun_service_name = "suzumina-click-nextjs-app"
  cloudrun_container_port = 8080
  cloudrun_cpu_limit = "1000m"  # 1 vCPU
  cloudrun_memory_limit = "512Mi"  # 512 MB
  # 初期デプロイ時のダミーイメージ
  cloudrun_initial_image = "gcr.io/cloudrun/hello"
  # デプロイ後にGitHub Actionsで更新される
}

# Cloud Run サービスの定義
resource "google_cloud_run_service" "nextjs_app" {
  name     = local.cloudrun_service_name
  location = var.region

  template {
    spec {
      containers {
        # 初期デプロイ用のダミーイメージ
        # 注意: 実際のデプロイはGitHub Actionsによって行われます
        image = local.cloudrun_initial_image
        
        # リソース制限を設定
        resources {
          limits = {
            cpu    = local.cloudrun_cpu_limit
            memory = local.cloudrun_memory_limit
          }
        }
        
        # 環境変数の設定
        # 基本環境変数
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "DEPLOY_ENV"
          value = "staging"  # 現在はステージング環境のみ
        }
        
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
          container_port = local.cloudrun_container_port
        }
      }
    }
  }

  # トラフィック設定
  traffic {
    percent         = 100
    latest_revision = true
  }

  # GitHub Actionsがイメージを更新するため
  # コンテナイメージと環境変数の変更を無視する
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].spec[0].containers[0].env,
      metadata[0].annotations,
      template[0].metadata[0].annotations
      # client と labels は存在しない属性なので削除
    ]
  }

  # 依存関係の管理
  depends_on = [
    google_project_service.run,           # cloudrun -> run に修正
    google_project_service.artifactregistry
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