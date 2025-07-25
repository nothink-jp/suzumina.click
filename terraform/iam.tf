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
# 最小権限サービスアカウント - Cloud Run専用デプロイアカウント
# ------------------------------------------------------------------------------

# Cloud Functions専用デプロイ用のサービスアカウント
resource "google_service_account" "cloud_functions_deployer_sa" {
  project      = var.gcp_project_id
  account_id   = "cloud-functions-deployer-sa"
  display_name = "Cloud Functionsデプロイ専用サービスアカウント"
  description  = "GitHub ActionsからCloud Functionsの更新のみを実行する最小権限サービスアカウント"
}

# サービスアカウントとWorkload Identity Poolの連携
resource "google_service_account_iam_binding" "cloud_functions_sa_binding" {
  service_account_id = google_service_account.cloud_functions_deployer_sa.name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/nothink-jp/suzumina.click"
  ]
  
  depends_on = [
    google_service_account.cloud_functions_deployer_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# Cloud Functions専用サービスアカウントに必要最小限の権限を付与
# Cloud Functions管理者権限
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

# サービスアカウント利用者権限
resource "google_project_iam_member" "cloud_functions_deployer_sa_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# Cloud Build Service Account権限（デプロイ用）
resource "google_project_iam_member" "cloud_functions_deployer_cloudbuild_builder" {
  project = var.gcp_project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  
  depends_on = [data.google_project.project]
}

# プロジェクト閲覧権限（Cloud Resource Manager API使用に必要）
resource "google_project_iam_member" "cloud_functions_deployer_viewer" {
  project = var.gcp_project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# Storage管理権限（Functions用zipファイルアップロードに必要）
resource "google_project_iam_member" "cloud_functions_deployer_storage_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# IAMポリシー設定権限（デプロイ用）
resource "google_project_iam_member" "cloud_functions_deployer_iam_admin" {
  project = var.gcp_project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${google_service_account.cloud_functions_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_functions_deployer_sa]
}

# GitHubリポジトリにWorkload Identity連携を設定
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.gcp_project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions ID Pool"  # 表示名を短く変更
  description               = "GitHubからの認証用のID Pool"
  
  # 初回作成後に保護設定を有効化する
  # lifecycle {
  #   prevent_destroy = true
  #   ignore_changes = [
  #     description,
  #     display_name
  #   ]
  # }
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

# サービスアカウントとWorkload Identity Poolの連携
resource "google_service_account_iam_binding" "github_sa_binding" {
  service_account_id = google_service_account.github_actions_sa.name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/nothink-jp/suzumina.click"
  ]
  
  depends_on = [
    google_service_account.github_actions_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# GitHub Actions用サービスアカウントにCloud Build起動権限を付与
resource "google_project_iam_member" "github_actions_cloudbuild_invoker" {
  project = var.gcp_project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [google_service_account.github_actions_sa]
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
    "artifactregistry.packages.delete",  # Dockerイメージ削除に必要
    "artifactregistry.versions.get",
    "artifactregistry.versions.list",
    "artifactregistry.versions.delete",  # クリーンアップに必要
    "artifactregistry.tags.create",
    "artifactregistry.tags.update",
    "artifactregistry.tags.get",
    "artifactregistry.tags.list"
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

# GitHub Actions用サービスアカウントにサービスアカウント利用者権限を付与
resource "google_project_iam_member" "github_actions_service_account_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [google_service_account.github_actions_sa]
}

# ------------------------------------------------------------------------------
# Admin アプリ用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

# Admin アプリ用のサービスアカウント
resource "google_service_account" "suzumina_admin_sa" {
  project      = var.gcp_project_id
  account_id   = "suzumina-admin-sa"
  display_name = "Suzumina Admin App Service Account"
  description  = "Admin アプリケーションがFirestoreにアクセスするためのサービスアカウント"
}

# Admin サービスアカウントにFirestore管理権限を付与
resource "google_project_iam_member" "admin_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.suzumina_admin_sa.email}"
  
  depends_on = [google_service_account.suzumina_admin_sa]
}

# Admin サービスアカウントにSecret Manager アクセス権限を付与
resource "google_project_iam_member" "admin_secret_manager_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.suzumina_admin_sa.email}"
  
  depends_on = [google_service_account.suzumina_admin_sa]
}

# GitHub Actions用サービスアカウントにAdmin SAのToken Creator権限を付与
resource "google_service_account_iam_member" "github_actions_admin_token_creator" {
  service_account_id = google_service_account.suzumina_admin_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [
    google_service_account.github_actions_sa,
    google_service_account.suzumina_admin_sa
  ]
}

# GitHub Actions用サービスアカウントにAdmin SAのUser権限を付与
resource "google_service_account_iam_member" "github_actions_admin_sa_user" {
  service_account_id = google_service_account.suzumina_admin_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [
    google_service_account.github_actions_sa,
    google_service_account.suzumina_admin_sa
  ]
}

# GitHub Actions用サービスアカウントにCloud Run IAM管理権限を付与
resource "google_project_iam_member" "github_actions_run_admin" {
  project = var.gcp_project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [google_service_account.github_actions_sa]
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

# ADDED: 関数のサービスアカウントにRun Invokerロールを付与
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
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [
    google_pubsub_topic.youtube_video_fetch_trigger,
    data.google_project.project,
  ]
}


# Cloud Schedulerが時系列データ収集トピックにメッセージを発行する権限 (非推奨・削除済み)
# ⚠️ 統合アーキテクチャにより廃止: fetchDLsiteUnifiedData が時系列データ収集も統合実行
# resource "google_pubsub_topic_iam_member" "scheduler_timeseries_pubsub_publisher" {
#   project = google_pubsub_topic.dlsite_timeseries_collect_trigger.project
#   topic   = google_pubsub_topic.dlsite_timeseries_collect_trigger.name
#   role    = "roles/pubsub.publisher"
#   member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
#   depends_on = [google_pubsub_topic.dlsite_timeseries_collect_trigger, data.google_project.project]
# }

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

# Eventarc Service AgentにプロジェクトのRun Invokerロールを付与（理想的には、特定の関数のRunサービスに制限）
# Eventarcが関数の基盤となるCloud Runサービスを呼び出せるようにする
# 注: プロジェクトレベルにバインドするのは必要以上に広範ですが、この例では簡単にするためです。
# より厳密なセキュリティのためには、関数に関連する特定のCloud Runサービスにバインドします。
resource "google_project_iam_member" "eventarc_run_invoker" {
  project = var.gcp_project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-eventarc.iam.gserviceaccount.com" # Eventarc SA

  depends_on = [
    data.google_project.project,
  ]
}

# 注: Pub/Sub -> Cloud Functions v2（Eventarcトリガー）のバインディングは通常、event_triggerブロックが定義されている場合、google_cloudfunctions2_functionリソースによって自動的に処理されます。
# これらの明示的なバインディングは、堅牢性を高めるために追加されています。


# ------------------------------------------------------------------------------
# 出力値
# ------------------------------------------------------------------------------

# Compute Engine デフォルトサービスアカウントにSecret Manager アクセス権限を付与
# (手動デプロイとの互換性のため - 将来的には専用SAに移行予定)
resource "google_project_iam_member" "compute_engine_secret_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

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