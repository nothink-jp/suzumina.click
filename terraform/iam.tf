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

# Cloud Run専用デプロイ用のサービスアカウント
resource "google_service_account" "cloud_run_deployer_sa" {
  project      = var.gcp_project_id
  account_id   = "cloud-run-deployer-sa"
  display_name = "Cloud Runデプロイ専用サービスアカウント"
  description  = "GitHub ActionsからCloud Runへのデプロイのみを実行する最小権限サービスアカウント"
}

# サービスアカウントとWorkload Identity Poolの連携
resource "google_service_account_iam_binding" "cloud_run_sa_binding" {
  service_account_id = google_service_account.cloud_run_deployer_sa.name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/nothink-jp/suzumina.click"
  ]
  
  depends_on = [
    google_service_account.cloud_run_deployer_sa,
    google_iam_workload_identity_pool.github_pool
  ]
}

# Cloud Run専用サービスアカウントに必要最小限の権限を付与
# Cloud Runサービス管理者権限
resource "google_project_iam_member" "cloud_run_deployer_admin" {
  project = var.gcp_project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_run_deployer_sa]
}

# Artifact Registryプッシュ権限（コンテナイメージのアップロード用）
resource "google_project_iam_member" "cloud_run_deployer_artifact_admin" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_run_deployer_sa]
}

# ログ書き込み権限
resource "google_project_iam_member" "cloud_run_deployer_log_writer" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_run_deployer_sa]
}

# サービスアカウント利用者権限
resource "google_project_iam_member" "cloud_run_deployer_sa_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [google_service_account.cloud_run_deployer_sa]
}

# Secret Managerアクセス権限 - Firebaseサービスアカウントキーへのアクセス用
resource "google_secret_manager_secret_iam_member" "cloud_run_deployer_firebase_sa_key_accessor" {
  project   = var.gcp_project_id
  secret_id = "FIREBASE_SERVICE_ACCOUNT_KEY"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [
    google_service_account.cloud_run_deployer_sa,
    google_secret_manager_secret.secrets["FIREBASE_SERVICE_ACCOUNT_KEY"]
  ]
}

# Discord認証関連のシークレットへのアクセス権限を付与
# NEXT_PUBLIC_DISCORD_CLIENT_ID へのアクセス権限
resource "google_secret_manager_secret_iam_member" "cloud_run_deployer_discord_client_id_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_CLIENT_ID"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [
    google_service_account.cloud_run_deployer_sa,
    google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_CLIENT_ID"]
  ]
}

# NEXT_PUBLIC_DISCORD_REDIRECT_URI へのアクセス権限
resource "google_secret_manager_secret_iam_member" "cloud_run_deployer_discord_redirect_uri_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_REDIRECT_URI"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_deployer_sa.email}"
  
  depends_on = [
    google_service_account.cloud_run_deployer_sa,
    google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_REDIRECT_URI"]
  ]
}

# ------------------------------------------------------------------------------
# 最小権限サービスアカウント - Cloud Functions専用デプロイアカウント
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

# GitHub Actions用サービスアカウントにCloudRun閲覧権限を付与
resource "google_project_iam_member" "github_actions_run_viewer" {
  project = var.gcp_project_id
  role    = "roles/run.viewer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
  
  depends_on = [google_service_account.github_actions_sa]
}

# ------------------------------------------------------------------------------
# discordAuthCallback関数用のサービスアカウントとIAM権限設定
# ------------------------------------------------------------------------------

# Discord認証コールバック関数用のサービスアカウント
resource "google_service_account" "discord_auth_callback_sa" {
  project      = var.gcp_project_id
  account_id   = "discord-auth-callback-sa"
  display_name = "Discord認証コールバック関数用サービスアカウント"
}

# サービスアカウントにDISCORD_CLIENT_IDシークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_CLIENT_ID"].secret_id
  role      = "roles/secretmanager.secretAccessor" # シークレットアクセサーロール
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # サービスアカウントのメールアドレスを参照

  # シークレットとサービスアカウントが作成されてから実行
  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.discord_auth_callback_sa,
  ]
}

# サービスアカウントにDISCORD_CLIENT_SECRETシークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "discord_client_secret_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["DISCORD_CLIENT_SECRET"].secret_id
  role      = "roles/secretmanager.secretAccessor" # シークレットアクセサーロール
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # サービスアカウントのメールアドレスを参照

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.discord_auth_callback_sa,
  ]
}

# サービスアカウントにDISCORD_REDIRECT_URIシークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "discord_redirect_uri_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["NEXT_PUBLIC_DISCORD_REDIRECT_URI"].secret_id
  role      = "roles/secretmanager.secretAccessor" # シークレットアクセサーロール
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # サービスアカウントのメールアドレスを参照

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.discord_auth_callback_sa,
  ]
}

# サービスアカウントにDISCORD_TARGET_GUILD_IDシークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "discord_target_guild_id_accessor" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets["DISCORD_TARGET_GUILD_ID"].secret_id
  role      = "roles/secretmanager.secretAccessor" # シークレットアクセサーロール
  member    = "serviceAccount:${google_service_account.discord_auth_callback_sa.email}" # サービスアカウントのメールアドレスを参照

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.discord_auth_callback_sa,
  ]
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
# サービス間の相互作用のためのIAMバインディング（スケジューラー -> Pub/Sub -> 関数）
# ------------------------------------------------------------------------------

# Cloud Scheduler Service AgentにPub/SubトピックのPublisherロールを付与
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

# Pub/Sub Service Agentに関数のサービスアカウントのToken Creatorロールを付与
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