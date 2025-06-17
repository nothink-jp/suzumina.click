# ==============================================================================
# DLsite作品取得関数 (v2 - Pub/Subトリガー)
# ==============================================================================
# 概要: DLsiteから最新の作品情報を定期的に取得しFirestoreに保存する関数
# GitHub Actions移行完了に伴い、ソースコード管理部分は削除済み
# ==============================================================================

# デプロイの共通設定
locals {
  dlsite_function_name = "fetchDLsiteWorks"
  dlsite_runtime       = "nodejs22"
  dlsite_entry_point   = "fetchDLsiteWorks" # 注: これをindex.tsで登録した関数名と一致させる
  dlsite_memory        = "512Mi"
  dlsite_timeout       = 540 # 秒（9分）- イベントトリガー制限に合わせる

  # この関数が必要とする環境変数（シークレット）のリスト（現在は不要だが将来拡張用）
  dlsite_secrets = [
    # DLsiteのスクレイピングにはAPIキーは不要だが、将来的にAPIが必要になった場合に備えて空リストを定義
  ]
}

# DLsite作品取得関数 (v2 - Pub/Subトリガー)
resource "google_cloudfunctions2_function" "fetch_dlsite_works" {
  project  = var.gcp_project_id
  name     = local.dlsite_function_name
  location = var.region

  # ビルド設定
  build_config {
    runtime     = local.dlsite_runtime
    entry_point = local.dlsite_entry_point
    # 初回デプロイ用にダミーのソースコードを設定
    # GitHub Actionsによる実際のデプロイでは上書きされる
    source {
      storage_source {
        bucket = google_storage_bucket.functions_deployment.name
        object = "function-source-dummy.zip"
      }
    }
  }

  # サービス設定
  service_config {
    max_instance_count = 1       # スケジュールタスクのため低めに設定
    min_instance_count = 0       # コールドスタートを許容
    available_memory   = local.dlsite_memory
    timeout_seconds    = local.dlsite_timeout
    # 専用のサービスアカウントを使用
    service_account_email = google_service_account.fetch_dlsite_works_sa.email

    # シークレット環境変数を動的に設定（現在は空だが将来拡張用）
    dynamic "secret_environment_variables" {
      for_each = local.dlsite_secrets
      content {
        key        = secret_environment_variables.value
        secret     = google_secret_manager_secret.secrets[secret_environment_variables.value].secret_id
        version    = "latest"
        project_id = var.gcp_project_id
      }
    }

    # CloudEventトリガーのための環境変数設定
    environment_variables = {
      FUNCTION_SIGNATURE_TYPE = "cloudevent"  # CloudEvent形式であることを明示
      FUNCTION_TARGET        = local.dlsite_entry_point  # エントリポイント名を指定
    }
  }

  # イベントトリガー設定 (Pub/Sub)
  event_trigger {
    trigger_region = var.region # 関数のリージョンと一致させる
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.dlsite_works_fetch_trigger.id
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY"
    # トリガー用にも同じ専用サービスアカウントを使用
    service_account_email = google_service_account.fetch_dlsite_works_sa.email
  }

  # GitHub Actions からのデプロイで関数コードのみの更新を許可するため、
  # ソースコードの変更は無視する（関数の設定変更のみをTerraformで管理）
  lifecycle {
    ignore_changes = [
      build_config # ビルド設定全体を無視（GitHub Actionsが管理）
    ]
  }

  depends_on = [
    # この関数に必要なFirestore DB、Pub/Subトピック、シークレット
    google_firestore_database.database,
    google_pubsub_topic.dlsite_works_fetch_trigger,
    google_project_iam_member.fetch_dlsite_works_firestore_user,
    google_project_iam_member.fetch_dlsite_works_log_writer,
    # サービスアカウントが存在することを確認
    google_service_account.fetch_dlsite_works_sa,
  ]
}

# DLsite作品取得関数用のサービスアカウントにシークレットアクセス権限を付与（将来拡張用）
resource "google_secret_manager_secret_iam_member" "dlsite_works_secret_accessor" {
  for_each  = toset(local.dlsite_secrets)
  
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.secrets[each.value].secret_id
  role      = google_project_iam_custom_role.secret_manager_accessor_role.id
  member    = "serviceAccount:${google_service_account.fetch_dlsite_works_sa.email}"

  depends_on = [
    google_secret_manager_secret.secrets,
    google_service_account.fetch_dlsite_works_sa,
    google_project_iam_custom_role.secret_manager_accessor_role
  ]
}

# Cloud Function のリソース情報を出力
output "fetch_dlsite_works_function_info" {
  value = {
    name     = google_cloudfunctions2_function.fetch_dlsite_works.name
    location = google_cloudfunctions2_function.fetch_dlsite_works.location
    state    = google_cloudfunctions2_function.fetch_dlsite_works.state
  }
  description = "DLsite作品取得関数の情報"
}