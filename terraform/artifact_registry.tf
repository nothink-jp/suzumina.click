/**
 * Artifact Registryリポジトリの設定
 *
 * GitHubActions等でDockerイメージを保存するための
 * Artifact Registryリポジトリを事前に作成します
 */

# Artifact Registryリポジトリの作成
resource "google_artifact_registry_repository" "docker_repo" {
  provider = google

  location      = var.region
  repository_id = "suzumina-click"
  description   = "suzumina.click用のDockerイメージリポジトリ"
  format        = "DOCKER"

  # イメージが削除されても30日間は保持する設定
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    condition {
      tag_state             = "ANY"
      tag_prefixes          = ["latest"]
      package_name_prefixes = ["nextjs-app"]
    }
  }
  
  cleanup_policies {
    id     = "delete-old-versions"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30日 (30 * 24 * 60 * 60秒)
      tag_state  = "ANY"
    }
  }

  # 必要に応じて、VPCネットワーク設定等を追加
}