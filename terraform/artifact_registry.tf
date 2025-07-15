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
  repository_id = var.artifact_registry_repository_id
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
      package_name_prefixes = ["web", "suzumina-admin"]
    }
  }
  
  cleanup_policies {
    id     = "delete-old-versions"
    action = "DELETE"
    condition {
      older_than = "604800s" # 7日 (7 * 24 * 60 * 60秒)
      tag_state  = "UNTAGGED"
    }
  }
  
  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
      package_name_prefixes = ["web"]
    }
  }

  cleanup_policies {
    id     = "keep-recent-admin-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3  # 管理者アプリは更新頻度が低いため3個まで
      package_name_prefixes = ["suzumina-admin"]
    }
  }

  # 必要に応じて、VPCネットワーク設定等を追加
}

# Cloud Functions用のArtifact Registryリポジトリ
# Google Cloudが自動作成したものをimportして管理
resource "google_artifact_registry_repository" "gcf_artifacts" {
  provider = google

  location      = var.region
  repository_id = "gcf-artifacts"
  description   = "This repository is created and used by Cloud Functions for storing function docker images."
  format        = "DOCKER"

  # Cloud Functions用のクリーンアップポリシー
  cleanup_policy_dry_run = false
  
  # 古いタグなしイメージを7日後に削除
  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      older_than = "604800s" # 7日 (7 * 24 * 60 * 60秒)
      tag_state  = "UNTAGGED"
    }
  }
  
  # 最新5バージョンを保持（Function毎）
  cleanup_policies {
    id     = "keep-recent-function-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  # ラベルを維持（Google Cloudが設定）
  labels = {
    goog-managed-by = "cloudfunctions"
  }
}