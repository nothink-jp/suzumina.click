/**
 * Artifact Registryリポジトリの設定
 *
 * GitHubActions等でDockerイメージを保存するための
 * Artifact Registryリポジトリを事前に作成します
 *
 * イメージ GC の正本はこのファイルの cleanup_policies（ADR-009 原則3: GC は Terraform ネイティブに一本化）。
 * deploy-web.yml / deploy-functions.yml の手動 image 削除は SPR-96 で撤去し、二重管理を解消した。
 *
 * cleanup_policies のセマンティクス（公式仕様）:
 *   - KEEP は DELETE に優先する（両方に一致する版は「保持」される）
 *   - most_recent_versions(keep_count) は「パッケージ単位」で最新 N 版を保持する
 *   - KEEP 単体では古い版を削除しない。実削除には DELETE ポリシーが必須
 *
 * 方針はディスク節約優先（SPR-96）: 直近5版を下限に、7日より古い版は削除する。
 */

# Artifact Registryリポジトリの作成（Cloud Run web 用）
resource "google_artifact_registry_repository" "docker_repo" {
  provider = google

  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "suzumina.click用のDockerイメージリポジトリ"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  # 保持方針（ディスク節約優先）:
  #   keep-recent-versions(KEEP/5) ... 直近5デプロイは経過日数に関係なく保持（rollback 下限）
  #   keep-minimum-versions(KEEP/latest) ... 本番が指す latest タグ版を明示保護（多重防御）
  #   delete-old(DELETE/7日/ANY) ... 7日より古い版（タグ付き・なし問わず）を削除。直近5版と latest は KEEP が勝つ
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    condition {
      tag_state             = "ANY"
      tag_prefixes          = ["latest"]
      package_name_prefixes = ["web"]
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than            = "604800s" # 7日 (7 * 24 * 60 * 60秒)
      tag_state             = "ANY"
      package_name_prefixes = ["web"]
    }
  }

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count            = 5
      package_name_prefixes = ["web"]
    }
  }
}

# Cloud Functions用のArtifact Registryリポジトリ
# Google Cloudが自動作成したものをimportして管理
resource "google_artifact_registry_repository" "gcf_artifacts" {
  provider = google

  location      = var.region
  repository_id = "gcf-artifacts"
  description   = "This repository is created and used by Cloud Functions for storing function docker images."
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  # 保持方針（関数単位＝パッケージ単位で評価される / ディスク節約優先）:
  #   keep-recent-function-versions(KEEP/5) ... 各関数の最新5版を経過日数に関係なく保持。
  #     稼働中の関数が参照する最新イメージは常にその関数の最新版＝必ず保持され、GC で関数が壊れない（KEEP > DELETE）
  #   delete-old(DELETE/7日/ANY) ... 7日より古い版を削除（各関数の直近5版は KEEP が勝つ）
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "604800s" # 7日 (7 * 24 * 60 * 60秒)
      tag_state  = "ANY"
    }
  }

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
