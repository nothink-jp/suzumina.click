# ==============================================================================
# DLsite の取り込み: スケジューラと、旧 Functions（fetchDLsiteUnifiedData）の土台
# ==============================================================================
# **取り込みは Cloud Run Jobs で動く**（SPR-417 / 設計は SPR-358。ジョブの定義は job_dlsite.tf）。
# このファイルにあるのは、ジョブを起動する Cloud Scheduler 2 本と、旧 Functions のための Pub/Sub トピック。
#
# 旧 Functions（fetchDLsiteUnifiedData）は、まだデプロイされている（deploy-functions.yml）。トピックと
# publisher の権限も残してある。**どこからも起動されない。** 戻すときの受け皿として SPR-419 まで残す。
# 戻し方: スケジューラ 2 本の http_target を、pubsub_target（このトピック宛て）に戻す。あわせて
# monitoring_dlsite.tf のアラートを関数向けに戻す（付け替えた PR ごと revert するのが確実）。
#
# 関数の spec の正本（deploy-functions.yml の gcloud functions deploy・ADR-009）:
#   runtime=nodejs<package.json の devEngines.runtime の major> / memory=512Mi / timeout=540s / max-instances=1
#   entry-point=fetchDLsiteUnifiedData / trigger-topic=dlsite-individual-api-trigger
# ==============================================================================

locals {
  dlsite_individual_api_function_name = "fetchDLsiteUnifiedData"

  # スケジューラがジョブを起動するときに呼ぶ、Cloud Run Admin API の実行エンドポイント
  dlsite_job_run_uris = {
    for key, job in google_cloud_run_v2_job.dlsite :
    key => "https://run.googleapis.com/v2/projects/${var.gcp_project_id}/locations/${job.location}/jobs/${job.name}:run"
  }
}

# Individual Info API専用のPub/Subトピック
resource "google_pubsub_topic" "dlsite_individual_api_trigger" {
  project = var.gcp_project_id
  name    = "dlsite-individual-api-trigger"

  labels = {
    environment = var.environment
    function    = "dlsite-individual-api"
    api-only    = "true"
    managed-by  = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# 通常の取り込みの Cloud Scheduler（毎時 3 分・3時台を除く＝1日23回）→ ジョブ fetch-dlsite-unified-data
#
# 1 回の実行は 55 分以内に終わる（アプリの予算＝process-batch.ts の JOB_RUN_BUDGET）ので、毎時の起動どうしは
# 重ならない。レート制限（429 / Retry-After つきの 404）を受けたら、ジョブが解除を待って同じ実行の中で続ける。
# 待つ時間が残らなければ正常終了し、次の毎時の実行が継続カーソルから続きを取る。
#
# 経緯: 2026-11-18 09:35〜17:55 JST は、10 分おき（毎時 3・13・23・33・43 分）で関数を起動していた（SPR-423 の
# つなぎ・#1145）。DLsite（Cloudflare）が 30 分のブロックを返し続けていて、開いている約 3 分に当たる回数を
# 増やすためだった。ブロックは同日 11:13 JST に解け、解けたあとは 1 時間に約 1,400 件（毎時 1 回のときの 5 倍）を
# 送っていたので、毎時に戻した（#1157）。ブロックが再発しても、起動を増やして当てにいく方法には戻さない。
#
# 2時間ごと → 1時間ごと（SPR-412）: DLsite のレート制限（推定 約100リクエスト/分）に合わせて
# 取得ペースを落とした結果、1 run で取得できるのは 450件までになった（SPR-410 / SPR-411）。
# 2時間ごと（12回/日）では 1日 5,400件で、必要量（volatile × 回数 + stable 約2,100件）に
# 余裕が無く、stable が1日で一巡しなかった。制限は分単位で、約1時間間隔で3回続けて走らせても
# 429 は出なかった（2026-11-15 実測）。時間単位・日単位の枠が無いことまでは未確認なので、
# 「DLsite Rate Limited Alert」が毎 run 鳴るようなら `3 */2 * * *` に戻す（戻すのはこの1行。
# run 途絶アラートの duration＝monitoring_dlsite.tf は 3h のままでも 2h 周期で誤発火しない）。
#
# 3時台を飛ばすのは、日曜 3:00 の checkDataIntegrity（約7分・works / circles / creators を
# 読んで事後修復する）と同時に走らせないため。2時間ごとのときは 2:03 と 4:03 で重ならなかった。
# その関係を保つ（曜日で分けると式が2本になるので、毎日飛ばしている）。
resource "google_cloud_scheduler_job" "fetch_dlsite_individual_api_hourly" {
  project = var.gcp_project_id
  region  = var.region
  name    = "fetch-dlsite-individual-api-hourly" # 名前は互換性のため変更しない

  description = "Individual Info API専用データ更新（1時間間隔・3時台を除く）"
  schedule    = "3 0-2,4-23 * * *" # 0:03, 1:03, 2:03, 4:03 ... 23:03（3:03 は無い）
  time_zone   = "Asia/Tokyo"
  paused      = false

  # ジョブの実行 API を直接呼ぶ（Pub/Sub と Eventarc を経由しない＝SPR-358）。モードはジョブの引数が持つので、
  # 本文は空の JSON（上書きは渡さない）。API は実行を始めたらすぐ返る（実行の完了は待たない）。
  # スケジューラのリトライは既定（0 回）のまま。起動に失敗した回の続きは、次の毎時の実行が取る。
  http_target {
    http_method = "POST"
    body        = base64encode("{}")
    headers     = { "Content-Type" = "application/json" }
    uri         = local.dlsite_job_run_uris["hourly"]

    oauth_token {
      service_account_email = google_service_account.fetch_dlsite_individual_api_sa.email
    }
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_cloud_run_v2_job_iam_member.dlsite_scheduler_invoker,
  ]
}

# SPR-229 Stage②: ティア差分の取りこぼし検知を兼ねた週次フルスイープ
# checkDataIntegrityの日曜3:00 JSTとは重ならない。通常runとは重なりうる（4:03 の run が長引いたとき）。
# その場合は pendingFullSweep が立ち、次のサイクルでフルスイープになる（「実行中」の印で飛ばされたときと、
# 継続中のサイクルと重なったとき＝resolveCycleInfo）。
# 土曜4:15 JSTに設定。ジョブ fetch-dlsite-unified-data-full-sweep（引数 dlsite-full-sweep）を起動する。
# 4:03 の毎時の実行がレート制限の待ちで走り続けていると（最長 4:58 まで）、印で飛ばされて pendingFullSweep が立つ。
# その場合のフルスイープは、次に新しいサイクルを始める毎時の実行が行う。
resource "google_cloud_scheduler_job" "fetch_dlsite_individual_api_weekly_full_sweep" {
  project = var.gcp_project_id
  region  = var.region
  name    = "fetch-dlsite-individual-api-weekly-full-sweep"

  description = "ティア差分の週次フルスイープ（取りこぼし検知・全件強制取得）"
  schedule    = "15 4 * * 6" # 毎週土曜4:15 JST
  time_zone   = "Asia/Tokyo"
  paused      = false

  # ジョブの実行 API を直接呼ぶ（Pub/Sub と Eventarc を経由しない＝SPR-358）。モードはジョブの引数が持つので、
  # 本文は空の JSON（上書きは渡さない）。API は実行を始めたらすぐ返る（実行の完了は待たない）。
  # スケジューラのリトライは既定（0 回）のまま。起動に失敗した回の続きは、次の毎時の実行が取る。
  http_target {
    http_method = "POST"
    body        = base64encode("{}")
    headers     = { "Content-Type" = "application/json" }
    uri         = local.dlsite_job_run_uris["weekly_full_sweep"]

    oauth_token {
      service_account_email = google_service_account.fetch_dlsite_individual_api_sa.email
    }
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_cloud_run_v2_job_iam_member.dlsite_scheduler_invoker,
  ]
}

# スケジューラがジョブを起動するための権限（run.jobs.run）。ジョブ単位で付ける。
# スケジューラは、ジョブの実行 SA（fetch-dlsite-individual-api-sa）の OAuth トークンで実行 API を呼ぶ。
# 専用の SA を足さなかったのは、この SA が Eventarc 用に project 単位の run.invoker を既に持っていて
# （iam.tf の fetch_dlsite_individual_api_run_invoker）、新しい主体を増やしても権限の範囲が狭まらないため。
# project 単位のほうは、旧 Functions を撤去するとき（SPR-419）に外す。そのあとも、このジョブ単位の付与で動く。
# トークンの発行は、Cloud Scheduler のサービスエージェントのロール（iam.serviceAccounts.getAccessToken を含む）が担う。
resource "google_cloud_run_v2_job_iam_member" "dlsite_scheduler_invoker" {
  for_each = google_cloud_run_v2_job.dlsite

  project  = var.gcp_project_id
  location = each.value.location
  name     = each.value.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.fetch_dlsite_individual_api_sa.email}"
}

# 旧 Functions 用: Cloud Scheduler が Pub/Sub トピックへ publish するための権限（戻すときのために残す＝SPR-419 まで）
resource "google_pubsub_topic_iam_member" "scheduler_individual_api_pubsub_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.dlsite_individual_api_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# Individual Info API関数のログベースメトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_errors" {
#   # Individual Info APIメトリクスを有効化
#   name   = "dlsite_individual_api_errors"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# severity>=ERROR
# EOF
#
#   metric_descriptor {
#     metric_kind = "CUMULATIVE"
#     value_type  = "INT64"
#     display_name = "DLsite Individual Info API エラー数"
#   }
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API成功率監視用メトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_success" {
#   # Individual Info API成功メトリクスを有効化
#   name   = "dlsite_individual_api_success"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# jsonPayload.message="Individual Info API処理完了"
# EOF
#
#   metric_descriptor {
#     metric_kind = "CUMULATIVE"
#     value_type  = "INT64"
#     display_name = "DLsite Individual Info API 成功数"
#   }
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API品質監視用メトリクス（手動デプロイのためコメントアウト）
# resource "google_logging_metric" "individual_api_quality" {
#   # Individual Info API品質メトリクスを有効化
#   name   = "dlsite_individual_api_quality"
#   filter = <<EOF
# resource.type="cloud_function"
# resource.labels.function_name="${local.dlsite_individual_api_function_name}"
# jsonPayload.message="データ品質検証"
# EOF
#
#   metric_descriptor {
#     metric_kind = "GAUGE"
#     value_type  = "DOUBLE"
#     display_name = "DLsite Individual Info API データ品質スコア"
#   }
#
#   value_extractor = "EXTRACT(jsonPayload.quality_score)"
#
#   # 手動デプロイされたfetchDLsiteUnifiedData関数への依存関係をコメントアウト
#   # depends_on = [
#   #   google_cloudfunctions2_function.fetch_dlsite_works_individual_api
#   # ]
# }

# Individual Info API関数の出力情報（手動デプロイのためコメントアウト）
# output "fetch_dlsite_individual_api_function_info" {
#   value = {
#     name = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.name
#     id = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.id
#     url = google_cloudfunctions2_function.fetch_dlsite_works_individual_api.url
#   }
#   description = "Individual Info API専用DLsite作品取得関数の情報"
# }

# Individual Info API専用トピック情報
output "dlsite_individual_api_topic_info" {
  value = {
    name = google_pubsub_topic.dlsite_individual_api_trigger.name
    id   = google_pubsub_topic.dlsite_individual_api_trigger.id
  }
  description = "Individual Info API専用Pub/Subトピックの情報"
}

# Individual Info API移行完了のアラート（手動デプロイのためコメントアウト）
# resource "google_monitoring_alert_policy" "individual_api_migration_complete" {
#   # Individual Info APIアラートを有効化
#   display_name = "DLsite Individual Info API移行完了アラート"
#   combiner     = "OR"
#   
#   conditions {
#     display_name = "Individual Info API移行完了検出"
#     
#     condition_threshold {
#       filter          = "resource.type=\"cloud_function\" resource.labels.function_name=\"${local.dlsite_individual_api_function_name}\" metric.type=\"logging.googleapis.com/user/dlsite_individual_api_success\""
#       duration        = "60s"
#       comparison      = "COMPARISON_GT"
#       threshold_value = 0
#       
#       aggregations {
#         alignment_period   = "300s"
#         per_series_aligner = "ALIGN_RATE"
#       }
#     }
#   }
#
#   notification_channels = [
#     google_monitoring_notification_channel.email.id
#   ]
#
#   alert_strategy {
#     notification_rate_limit {
#       period = "300s"
#     }
#   }
#
#   depends_on = [
#     google_logging_metric.individual_api_success,
#     google_monitoring_notification_channel.email,
#   ]
# }