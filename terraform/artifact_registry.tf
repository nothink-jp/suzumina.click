/**
 * Artifact Registryリポジトリの設定
 *
 * GitHubActions等でDockerイメージを保存するための
 * Artifact Registryリポジトリを事前に作成します
 *
 * イメージ GC の正本はこのファイルの cleanup_policies（ADR-009 原則3: GC は Terraform ネイティブに一本化）。
 * deploy-web.yml / deploy-functions.yml の手動 image 削除は SPR-96 で撤去し、二重管理を解消した。
 *
 * 【例外】docker_repo（web パッケージ）の cleanup_policies は SPR-220 の再観測（2026-07-06）で
 * このリポジトリに対して実効性がないと確定した（clean manifest 化後も delete-old 対象の版が
 * 10日超残存）。原因不明の GCP 側の挙動のため、policy 定義自体は「宣言的な意図・将来 GCP 側で
 * 動くようになった場合の保険」として残す（実害はない）。実際の削除実行は SPR-247 により
 * deploy-web.yml の post-deploy ステップが digest 単位で自前実施する（このファイルの
 * ポリシーと同じ keep-recent-versions=5 / latest タグ保持 / 7日超削除のロジックを踏襲）。
 * gcf-artifacts（Cloud Functions）側は cleanup_policies が正常に機能しており対象外。
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
