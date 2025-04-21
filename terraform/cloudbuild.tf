# Cloud Build Triggerの定義
resource "google_cloudbuild_trigger" "manual_deploy_trigger" {
  name        = "suzumina-click-manual-deploy-trigger"
  description = "手動で評価環境へのデプロイをトリガーする"
  
  # GitHub連携設定
  github {
    owner = "nothink-jp"
    name  = "suzumina.click"
    push {
      branch = ".*"  # 全ブランチ対象（手動トリガーだが任意のブランチを指定可能）
      invert_regex = false
    }
  }
  
  # Cloud Build設定ファイルの指定
  filename = "cloudbuild.yaml"
  
  # 任意のブランチからのビルドを許可
  included_files = ["**"]
  
  # 手動トリガー
  trigger_template {
    branch_name = ".*"  # 全ブランチ対象
    repo_name   = "github_nothink-jp_suzumina.click"
  }
}

# Cloud BuildサービスアカウントにCloud Run管理権限を付与
resource "google_project_iam_member" "cloudbuild_cloudrun_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# Cloud BuildサービスアカウントにIAM権限付与
resource "google_project_iam_member" "cloudbuild_iam" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}