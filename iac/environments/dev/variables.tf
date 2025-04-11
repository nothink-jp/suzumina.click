# 開発環境（suzumina-click-dev）用の変数定義

variable "project_id" {
  description = "GCPプロジェクトID (suzumina-click-dev)"
  type        = string
}

variable "region" {
  description = "GCPリージョン（デフォルト: 東京リージョン）"
  type        = string
  default     = "asia-northeast1"
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registryリポジトリ名（Dockerイメージ保存用）"
  type        = string
  default     = "suzumina-click-docker-repo"
}

variable "cloud_run_service_name" {
  description = "Cloud Runサービス名（Next.jsアプリケーション用）"
  type        = string
  default     = "web"
}

variable "deployer_service_account_id" {
  description = "GitHub Actions用のデプロイサービスアカウントID"
  type        = string
  default     = "github-actions-deployer"
}

variable "runtime_service_account_id" {
  description = "Cloud Run実行時のサービスアカウントID"
  type        = string
  default     = "app-runtime"
}

variable "db_password" {
  description = "Cloud SQL PostgreSQLデータベースのパスワード（terraform apply時に指定）"
  type        = string
  sensitive   = true
}

# 使用例：
# terraform apply \
#   -var="project_id=suzumina-click-dev" \
#   -var="db_password=適切なパスワード"
#
# または、terraform.tfvarsファイルを作成：
# project_id = "suzumina-click-dev"
# db_password = "適切なパスワード"
#
# 注意：
# - db_passwordは安全な方法で管理してください
# - terraform.tfvarsはGitで管理しないでください
# - 本番環境用の設定は今後の課題として別途検討します