# プロジェクト詳細を取得するためのデータソース（プロジェクト番号など）
data "google_project" "project" {
  project_id = var.gcp_project_id
}

# ------------------------------------------------------------------------------
# GitHub Actions CI/CD用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

# GitHub Actions用のサービスアカウント
resource "google_service_account" "github_actions_sa" {
  project      = var.gcp_project_id
  account_id   = "github-actions-sa"
  display_name = "GitHub Actions用サービスアカウント"
  description  = "GitHub Actionsワークフローからデプロイを実行するためのサービスアカウント"
}

# ------------------------------------------------------------------------------
# Cloud Functions デプロイ用サービスアカウント（deploy-functions.yml）
# ------------------------------------------------------------------------------

# Cloud Functions専用デプロイ用のサービスアカウント
resource "google_service_account" "cloud_functions_deployer_sa" {
  project      = var.gcp_project_id
  account_id   = "cloud-functions-deployer-sa"
  display_name = "Cloud Functionsデプロイ専用サービスアカウント"
  description  = "GitHub ActionsからCloud Functionsの更新のみを実行する最小権限サービスアカウント"
}

# WIF 連携: main ブランチ限定（SPR-344）。使うのは deploy-functions.yml（push(main) / workflow_dispatch(main)）だけで、
# PR から assume する理由が無い。repo 限定は provider の attribute_condition が担う。
resource "google_service_account_iam_binding" "cloud_functions_sa_binding" {
  service_account_id = google_service_account.cloud_functions_deployer_sa.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.ref/refs/heads/main"
  ]

  depends_on = [
    google_service_account.cloud_functions_deployer_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# 関数の作成・更新（roles/cloudfunctions.developer。管理者ロールではない）
resource "google_project_iam_member" "cloud_functions_deployer_developer" {
  project = var.gcp_project_id
  role    = "roles/cloudfunctions.developer"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"

  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# ログ書き込み権限
resource "google_project_iam_member" "cloud_functions_deployer_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"

  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# actAs は実際に使う SA にだけ付ける（SPR-344）。project 単位だと terraform-apply-sa を含む全 SA に actAs できた。
# 対象は deploy-functions.yml で指定する SA: 各関数の runtime SA（--service-account・Eventarc trigger SA も兼ねる）と
# ビルド SA（--build-service-account）。どちらかを足したらここにも足す。以前は既定のビルド SA である compute default SA
# にも actAs していたが、ビルドを functions_build_sa に分けて外した（SPR-373）。
locals {
  cloud_functions_deployer_act_as_sas = {
    fetch_youtube_videos        = google_service_account.fetch_youtube_videos_sa.name
    fetch_dlsite_individual_api = google_service_account.fetch_dlsite_individual_api_sa.name
    data_integrity_check        = google_service_account.data_integrity_check_sa.name
    functions_build             = google_service_account.functions_build_sa.name
  }
}

resource "google_service_account_iam_member" "cloud_functions_deployer_act_as" {
  for_each           = local.cloud_functions_deployer_act_as_sas
  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
}

# ------------------------------------------------------------------------------
# Cloud Functions のビルド専用サービスアカウント（SPR-373）
# ------------------------------------------------------------------------------
# 既定のビルド SA は compute default SA で、project 全体の secretAccessor などを持つ。デプロイ SA はビルドを
# 通じてその権限でコードを動かせたため、ビルドだけに要る権限を持つ専用 SA に分ける。
# 必要な権限は Cloud Functions のドキュメント（カスタムビルド SA）どおり: ログの書き込み・gcf-artifacts への
# イメージの push・ソースバケットの読み取り。deploy-functions.yml の --build-service-account で指定する。

resource "google_service_account" "functions_build_sa" {
  project      = var.gcp_project_id
  account_id   = "functions-build-sa"
  display_name = "Cloud Functions build SA"
  description  = "Cloud Functions（gen2）のビルド専用。compute default SA の代わりに使う（SPR-373）"
}

resource "google_project_iam_member" "functions_build_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.functions_build_sa.email}"
}

resource "google_artifact_registry_repository_iam_member" "functions_build_gcf_artifacts_writer" {
  project    = var.gcp_project_id
  location   = google_artifact_registry_repository.gcf_artifacts.location
  repository = google_artifact_registry_repository.gcf_artifacts.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.functions_build_sa.email}"

  # apply SA がリポジトリの IAM を変える権限（artifactregistry.admin）を得てから付与する。
  # IAM の反映には時間差があるので、初回の apply がこの付与だけ 403 で失敗したら、apply を再実行する。
  depends_on = [google_project_iam_member.terraform_apply_sa_roles["roles/artifactregistry.admin"]]
}

# ソースの読み取り。デプロイ zip を置くバケットと、Cloud Functions が自動で作るソース用バケット
# （gcf-v2-sources-* / gcf-v2-uploads-* / run-sources-*。terraform 管理外なので名前の前方一致で絞る）。
# project 単位の無条件の objectViewer にはしない（tfstate バケットまで読めてしまう）。
resource "google_storage_bucket_iam_member" "functions_build_deployment_viewer" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.functions_build_sa.email}"
}

resource "google_project_iam_member" "functions_build_gcf_sources_viewer" {
  project = var.gcp_project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.functions_build_sa.email}"

  condition {
    title       = "gcf-source-buckets-only"
    description = "Cloud Functions が自動で作るソース用バケットだけ"
    expression  = "resource.name.startsWith(\"projects/_/buckets/gcf-v2-sources-\") || resource.name.startsWith(\"projects/_/buckets/gcf-v2-uploads-\") || resource.name.startsWith(\"projects/_/buckets/run-sources-\")"
  }
}

# compute default SA に付けていた roles/cloudbuild.builds.builder（既定のビルド SA 用）と project 全体の
# roles/secretmanager.secretAccessor は、ビルドを functions_build_sa に分けたので SPR-373 で撤去した。
# compute SA で動くサービスは無い（Cloud Run は全て専用 SA）。自動で付いた roles/editor は terraform 管理外で、手で外す。
# 手で gcloud functions deploy するときも --build-service-account（functions_build_sa）が必須。付けないと既定の
# compute SA でビルドしようとして、権限が無く失敗する（デプロイ SA なら compute SA への actAs が無く、ビルド前に失敗する）。

# プロジェクト閲覧権限（Cloud Resource Manager API使用に必要）
resource "google_project_iam_member" "cloud_functions_deployer_viewer" {
  project = var.gcp_project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"

  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# zip のアップロード権限は functions_deployment バケット単位で付けている（storage.tf）。
# 以前ここにあった project 単位の roles/storage.admin（tfstate バケットの IAM まで変えられた）と
# roles/resourcemanager.projectIamAdmin（自分に owner を付けられた）は SPR-344 で撤去した。
# 監査ログ上、この SA の SetIamPolicy 呼び出しは保持期間（約13か月）内に一度も無い。

# GitHubリポジトリにWorkload Identity連携を設定
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.gcp_project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions ID Pool" # 表示名を短く変更
  description               = "GitHubからの認証用のID Pool"
}

# GitHubプロバイダを設定
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.gcp_project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # GitHub Actionsからの認証時に検証する条件を追加
  attribute_condition = "attribute.repository == \"nothink-jp/suzumina.click\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# WIF 連携: main ブランチ限定（SPR-344）。使うのは deploy-web.yml（push(main) / workflow_dispatch(main)）だけ。
resource "google_service_account_iam_binding" "github_sa_binding" {
  service_account_id = google_service_account.github_actions_sa.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.ref/refs/heads/main"
  ]

  depends_on = [
    google_service_account.github_actions_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# GitHub Actions用サービスアカウントにログ閲覧権限を付与
resource "google_project_iam_member" "github_actions_log_viewer" {
  project = var.gcp_project_id
  role    = "roles/logging.viewer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"

  depends_on = [google_service_account.github_actions_sa]
}

# GitHub Actions用サービスアカウントにCloudRun管理権限を付与
resource "google_project_iam_member" "github_actions_run_developer" {
  project = var.gcp_project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"

  depends_on = [google_service_account.github_actions_sa]
}

# GitHub Actions用カスタムロール（Artifact Registry管理権限）
resource "google_project_iam_custom_role" "github_actions_artifact_registry_role" {
  project     = var.gcp_project_id
  role_id     = "githubActionsArtifactRegistryManager"
  title       = "GitHub Actions Artifact Registry Manager"
  description = "Custom role for GitHub Actions to manage Artifact Registry images with cleanup permissions"

  permissions = [
    "artifactregistry.repositories.get",
    "artifactregistry.repositories.list",
    "artifactregistry.packages.get",
    "artifactregistry.packages.list",
    "artifactregistry.packages.delete", # Dockerイメージ削除に必要
    "artifactregistry.versions.get",
    "artifactregistry.versions.list",
    "artifactregistry.versions.delete", # クリーンアップに必要
    "artifactregistry.tags.create",
    "artifactregistry.tags.update",
    "artifactregistry.tags.get",
    "artifactregistry.tags.list",
    "artifactregistry.tags.delete" # SPR-247: versions delete --delete-tags に必要（tags.delete不足でPERMISSION_DENIED実測）
  ]
}

# GitHub Actions用サービスアカウントにArtifact Registry書き込み権限を付与
resource "google_project_iam_member" "github_actions_artifact_registry_writer" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"

  depends_on = [google_service_account.github_actions_sa]
}

# GitHub Actions用サービスアカウントにカスタムArtifact Registry管理権限を付与  
resource "google_project_iam_member" "github_actions_artifact_registry_manager" {
  project = var.gcp_project_id
  role    = google_project_iam_custom_role.github_actions_artifact_registry_role.name
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"

  depends_on = [
    google_service_account.github_actions_sa,
    google_project_iam_custom_role.github_actions_artifact_registry_role
  ]
}

# actAs は Cloud Run の runtime SA（cloud-run-nextjs）にだけ付ける（SPR-344）。project 単位だと
# terraform-apply-sa を runtime SA にした revision を deploy でき、その権限でコードを動かせた。
resource "google_service_account_iam_member" "github_actions_act_as_cloud_run" {
  service_account_id = google_service_account.cloud_run_service_account.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# roles/run.admin（run.developer との差分は setIamPolicy）と roles/cloudbuild.builds.editor は SPR-344 で撤去した。
# invoker は terraform が正本（cloud_run.tf）で deploy から --allow-unauthenticated を外して以降
# run.services.setIamPolicy の呼び出しは無い（最終 2026-05-31）。Cloud Build は deploy-web がランナー上の buildx でビルドするため使っていない。

# ------------------------------------------------------------------------------
# Terraform CI: plan 用 read-only サービスアカウント（ADR-010 / SPR-99 Stage 1）
# ------------------------------------------------------------------------------
# PR 上の `terraform plan` を read-only 権限で実行する。書き込み権限も承認ゲートも持たない。
# apply 用の強権限 SA（terraform-apply-sa）は Stage 2 で別途追加し、main 限定 + Environment 承認を課す。

resource "google_service_account" "terraform_plan_sa" {
  project      = var.gcp_project_id
  account_id   = "terraform-plan-sa"
  display_name = "Terraform plan (read-only) SA"
  description  = "PR 上で terraform plan を read-only 実行するための CI サービスアカウント（ADR-010）"
}

# WIF 連携: repo 限定（任意ブランチ＝PR から assume 可。read-only なので許容）
resource "google_service_account_iam_binding" "terraform_plan_sa_wif" {
  service_account_id = google_service_account.terraform_plan_sa.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/nothink-jp/suzumina.click"
  ]

  depends_on = [
    google_service_account.terraform_plan_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# plan のためのプロジェクト全体 read 権限（refresh 用）
resource "google_project_iam_member" "terraform_plan_viewer" {
  project = var.gcp_project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.terraform_plan_sa.email}"

  depends_on = [google_service_account.terraform_plan_sa]
}

# plan の refresh は IAM ポリシー（getIamPolicy）も読む。roles/viewer には getIamPolicy が無く
# google_*_iam_member / iam_binding の refresh が 403 になるため、read-only の securityReviewer を付与する。
resource "google_project_iam_member" "terraform_plan_security_reviewer" {
  project = var.gcp_project_id
  role    = "roles/iam.securityReviewer"
  member  = "serviceAccount:${google_service_account.terraform_plan_sa.email}"

  depends_on = [google_service_account.terraform_plan_sa]
}

# tfstate バケットの read（state 読み取り。plan は -lock=false で lock 書き込み不要）
resource "google_storage_bucket_iam_member" "terraform_plan_state_viewer" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.terraform_plan_sa.email}"

  depends_on = [google_service_account.terraform_plan_sa]
}

# ------------------------------------------------------------------------------
# Terraform CI: apply 用 強権限サービスアカウント（ADR-010 / SPR-99 Stage 2）
# ------------------------------------------------------------------------------
# main へ merge された terraform 変更を、GitHub Environment(production) の required reviewer 承認後に apply する。
# WIF 連携は Environment(production) を参照する job のトークンだけに限定する（SPR-372）。GCP が見るのは
# Environment 名だけで、承認と main 限定は Environment の protection rules（IaC 外）が担う。
# read-only の plan SA とは権限を分離する。

resource "google_service_account" "terraform_apply_sa" {
  project      = var.gcp_project_id
  account_id   = "terraform-apply-sa"
  display_name = "Terraform apply (privileged) SA"
  description  = "main からの terraform apply を Environment 承認下で実行する CI SA（ADR-010 Stage 2）"
}

# WIF 連携: `environment: production` を持つ job の subject（google.subject = assertion.sub）だけに限定する（SPR-372）。
# 以前の attribute.ref/refs/heads/main は承認を見ておらず、main で動く id-token: write の job（deploy・drift 系の
# schedule 等）なら承認なしで assume できた。Environment を参照する job は承認を通らないと起動しないので、
# トークンを得た時点で承認済みになる。main 限定は Environment(production) の deployment branch policy が担う。
# したがって required reviewer と deployment branch policy（main のみ）は外さないこと。外すとこの束縛は変わらないままゲートが消える。
# Environment 名 `production` がこの SA を引き受けられる境界になる。apply job 以外に `environment: production` を付けないこと
# （deploy 系に Environment secrets 目的で付けると、その job も apply SA を引き受けられる）。
# sub の形式は GitHub の既定（include_claim_keys で sub をカスタマイズすると assume できなくなる）。
# 値は監査ログの serviceAccountDelegationInfo.principalSubject で実測済み。
resource "google_service_account_iam_binding" "terraform_apply_sa_wif" {
  service_account_id = google_service_account.terraform_apply_sa.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principal://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/subject/repo:nothink-jp/suzumina.click:environment:production"
  ]

  depends_on = [
    google_service_account.terraform_apply_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# curated strong: terraform が管理する全リソース＋その IAM をカバーする選定セット（roles/owner は回避）。
# editor だけでは setIamPolicy（bucket/topic/secret/run/project/SA）・KMS・WIF・サービス有効化が不足するため
# サービス別 admin を併用する。terraform で billing（予算）は管理していないため billing 権限は不要。
locals {
  terraform_apply_sa_roles = [
    "roles/editor",                          # 大半のリソース CRUD（run/scheduler/firestore/monitoring/logging/pubsub/AR/functions 等）
    "roles/logging.configWriter",            # editor は logging.sinks.get/list のみで書き込み不可（logMetrics はフル）。sink 更新（logging.tf）に必須
    "roles/resourcemanager.projectIamAdmin", # google_project_iam_member（プロジェクト IAM、32件）
    "roles/iam.serviceAccountAdmin",         # google_service_account + SA IAM binding
    "roles/iam.roleAdmin",                   # google_project_iam_custom_role（カスタムロール 2件）
    "roles/iam.workloadIdentityPoolAdmin",   # WIF pool / provider
    "roles/storage.admin",                   # bucket IAM + lifecycle + tfstate の state 読み書き/ロック
    "roles/pubsub.admin",                    # pubsub topic IAM
    "roles/secretmanager.admin",             # secret 本体 + secret IAM
    "roles/cloudkms.admin",                  # KMS keyring/key/IAM（editor 対象外）
    "roles/run.admin",                       # Cloud Run service IAM binding（public_access）
    "roles/artifactregistry.admin",          # AR repository IAM（functions_build_gcf_artifacts_writer）。editor には setIamPolicy が無い（SPR-373）
    "roles/serviceusage.serviceUsageAdmin",  # google_project_service の有効/無効化
  ]
}

resource "google_project_iam_member" "terraform_apply_sa_roles" {
  for_each = toset(local.terraform_apply_sa_roles)
  project  = var.gcp_project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.terraform_apply_sa.email}"

  depends_on = [google_service_account.terraform_apply_sa]
}

# ------------------------------------------------------------------------------
# Claude Code クラウドセッション用 read-only サービスアカウント
# ------------------------------------------------------------------------------
# アラート調査（メトリクス・ログ・Cloud Run / Pub/Sub / Eventarc の状態確認）をクラウドセッションから行うための identity。
# クラウドセッションは WIF で assume できないため、この SA だけは**キー認証**になる。
#
# キーは terraform 管理外（google_service_account_key を使わない）: tfstate に秘密鍵が平文で残るため。
# `gcloud iam service-accounts keys create` で手動発行し、Claude の環境設定（Default 環境）に登録する。
# Default 環境は全セッションで共有されキーがどのセッションからも見えるので、ロールは viewer 系に限る。
# Firestore（datastore.*）・Secret Manager の読み取りは付けない（roles/viewer を避けているのもこのため）。

# 手動作成された既存 SA を管理下へ取り込む（ga4_reader と同じ扱い）。
import {
  to = google_service_account.claude_readonly
  id = "projects/${var.gcp_project_id}/serviceAccounts/claude-readonly@${var.gcp_project_id}.iam.gserviceaccount.com"
}

resource "google_service_account" "claude_readonly" {
  project      = var.gcp_project_id
  account_id   = "claude-readonly"
  display_name = "Claude cloud session (read-only)"
  description  = "Claude Code クラウドセッションからのアラート調査用。キーは手動発行・terraform 管理外"
}

locals {
  claude_readonly_roles = [
    "roles/monitoring.viewer", # アラートポリシー・時系列メトリクス
    "roles/logging.viewer",    # リクエストログ・アプリログ
    "roles/run.viewer",        # Cloud Run サービス・revision の設定と状態
    "roles/pubsub.viewer",     # topic・subscription の設定（ackDeadline / retryPolicy 等）。メッセージの pull・publish は含まない
    "roles/eventarc.viewer",   # Eventarc trigger の設定（宛先・retryPolicy 等）。messageBuses.use 等の非閲覧権限を含むが、create 系が無いので使えない（Eventarc Advanced を導入したら見直す）
  ]
}

resource "google_project_iam_member" "claude_readonly_roles" {
  for_each = toset(local.claude_readonly_roles)
  project  = var.gcp_project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.claude_readonly.email}"

  depends_on = [google_service_account.claude_readonly]
}

# GCS の閲覧はバケット単位で付ける。project 単位の roles/storage.objectViewer は不可:
# tfstate は project の全構成と通知先メール等を含む。
# アプリ機密（secret_data）は SPR-374 で state から外したが、閲覧の範囲は必要なバケットに絞る方針を保つ。
resource "google_storage_bucket_iam_member" "claude_readonly_functions_deployment_viewer" {
  bucket = google_storage_bucket.functions_deployment.name
  role   = "roles/storage.objectViewer" # オブジェクトの list / get のみ。デプロイ zip（中身・残存）の恒常的な調査用
  member = "serviceAccount:${google_service_account.claude_readonly.email}"
}

# ------------------------------------------------------------------------------
# fetchYouTubeVideos関数用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

# YouTube動画取得関数用のサービスアカウント
resource "google_service_account" "fetch_youtube_videos_sa" {
  project      = var.gcp_project_id
  account_id   = "fetch-youtube-videos-sa" # 新しいサービスアカウントID
  display_name = "YouTube動画取得関数用サービスアカウント"
}

# サービスアカウントにFirestoreユーザーロールを付与
resource "google_project_iam_member" "fetch_youtube_videos_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user" # Firestoreの読み書きアクセス用ロール
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}

# サービスアカウントにYOUTUBE_API_KEYシークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "youtube_api_key_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["YOUTUBE_API_KEY"].secret_id
  role      = "roles/secretmanager.secretAccessor" # シークレットアクセサーロール
  member    = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.fetch_youtube_videos_sa,
  ]
}

# サービスアカウントにログライターロールを付与
resource "google_project_iam_member" "fetch_youtube_videos_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter" # ログ書き込み用ロール
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}

# 関数のサービスアカウントにRun Invokerロールを付与
resource "google_project_iam_member" "fetch_youtube_videos_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.fetch_youtube_videos_sa.email}"

  depends_on = [google_service_account.fetch_youtube_videos_sa]
}

# ------------------------------------------------------------------------------
# DLsite Individual Info API関数用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

# Individual Info API専用関数用のサービスアカウント
resource "google_service_account" "fetch_dlsite_individual_api_sa" {
  project      = var.gcp_project_id
  account_id   = "fetch-dlsite-individual-api-sa"
  display_name = "DLsite Individual Info API専用関数用サービスアカウント"
}

# サービスアカウントにFirestoreユーザーロールを付与
resource "google_project_iam_member" "fetch_dlsite_individual_api_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.fetch_dlsite_individual_api_sa.email}"

  depends_on = [google_service_account.fetch_dlsite_individual_api_sa]
}

# サービスアカウントにログライターロールを付与
resource "google_project_iam_member" "fetch_dlsite_individual_api_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.fetch_dlsite_individual_api_sa.email}"

  depends_on = [google_service_account.fetch_dlsite_individual_api_sa]
}

# 関数のサービスアカウントにRun Invokerロールを付与
resource "google_project_iam_member" "fetch_dlsite_individual_api_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.fetch_dlsite_individual_api_sa.email}"

  depends_on = [google_service_account.fetch_dlsite_individual_api_sa]
}


# ------------------------------------------------------------------------------
# サービス間の相互作用のためのIAMバインディング（スケジューラー -> Pub/Sub -> 関数）
# ------------------------------------------------------------------------------

# Cloud Scheduler Service AgentにYouTube用Pub/SubトピックのPublisherロールを付与
resource "google_pubsub_topic_iam_member" "scheduler_pubsub_publisher" {
  project = google_pubsub_topic.youtube_video_fetch_trigger.project
  topic   = google_pubsub_topic.youtube_video_fetch_trigger.name
  role    = "roles/pubsub.publisher"
  # データソースからプロジェクト番号を使用してサービスエージェントのメールアドレスを構築
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [
    google_pubsub_topic.youtube_video_fetch_trigger,
    data.google_project.project,
  ]
}


# Pub/Sub Service AgentにYouTube関数のサービスアカウントのToken Creatorロールを付与
# Pub/SubがEventarc経由で認証された関数呼び出しのためにOIDCトークンを作成できるようにする
resource "google_service_account_iam_member" "pubsub_token_creator" {
  service_account_id = google_service_account.fetch_youtube_videos_sa.name # 関数が実行されるSA
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com" # Pub/Sub SA

  depends_on = [
    google_service_account.fetch_youtube_videos_sa,
    data.google_project.project,
  ]
}


# Eventarc Service AgentにプロジェクトのEvent Receiverロールを付与
# Eventarcが関数のサービスアカウントにイベントを配信できるようにする
resource "google_project_iam_member" "eventarc_event_receiver" {
  project = var.gcp_project_id # プロジェクトレベルにバインド
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-eventarc.iam.gserviceaccount.com" # Eventarc SA

  depends_on = [
    data.google_project.project,
  ]
}

# Eventarc Service AgentにプロジェクトのRun Invokerロールを付与
# Eventarcが関数の基盤となるCloud Runサービスを呼び出せるようにする。project 単位で広い（関数の Cloud Run サービス単位に絞れる）。
resource "google_project_iam_member" "eventarc_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-eventarc.iam.gserviceaccount.com" # Eventarc SA

  depends_on = [
    data.google_project.project,
  ]
}


# ------------------------------------------------------------------------------
# 出力値
# ------------------------------------------------------------------------------

# プロジェクト番号を出力（GitHub Actionsで使用）
output "project_number" {
  description = "Google Cloud プロジェクト番号"
  value       = data.google_project.project.number
}

# Workload Identity Pool の完全な識別子を出力
output "workload_identity_provider" {
  description = "GitHub Actions用のWorkload Identity Provider識別子"
  value       = "projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id}"
}