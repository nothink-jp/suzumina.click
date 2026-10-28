# ==============================================================================
# お問い合わせフォームの Turnstile 検証停止の監視（SPR-399）
# ==============================================================================
# apps/web/src/lib/turnstile.ts の verifyTurnstileToken は fail closed で、確かめられないときは
# 送信を拒否して `jsonPayload.alert` 付きの ERROR を出す（SPR-398）。拒否はユーザーには
# 「送信前の確認に失敗しました」としか見えず、運営は気づけないため、ここで通知する。
#   - turnstile_secret_missing:        TURNSTILE_SECRET_KEY が無い（設定漏れ）
#   - turnstile_siteverify_unavailable: siteverify が HTTP エラー／到達不能／タイムアウト（Cloudflare 障害）
#   - turnstile_site_key_missing:      TURNSTILE_SITE_KEY が無く、/contact を送信不可で表示した（設定漏れ）。
#     フォームがその場で止めるので上の 2 つは出ない。表示のたびに出る（contact/page.tsx）
# どれも 1 件で取りこぼし（か、その手前）を意味し、お問い合わせ自体が低頻度なので閾値は >0。
# 検証の失敗（success: false＝ボットや期限切れトークン）は WARN で alert を付けておらず、対象外。
# alert の値は監視の契約。turnstile.ts 側を変えたらこのフィルタも同じ PR で直す（CLAUDE.md §1）。

resource "google_logging_metric" "turnstile_unavailable" {
  name    = "turnstile_unavailable"
  project = var.gcp_project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${var.cloud_run_service_name}"
    jsonPayload.alert=("turnstile_secret_missing" OR "turnstile_siteverify_unavailable" OR "turnstile_site_key_missing")
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "Turnstile unavailable"

    labels {
      key         = "alert"
      value_type  = "STRING"
      description = "turnstile_secret_missing / turnstile_siteverify_unavailable / turnstile_site_key_missing"
    }
  }

  # 通知とダッシュボードで「設定漏れ」か「Cloudflare 障害」かを見分けるため
  label_extractors = {
    "alert" = "EXTRACT(jsonPayload.alert)"
  }
}

resource "google_monitoring_alert_policy" "turnstile_unavailable" {
  display_name = "Turnstile Unavailable Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "Turnstile を使えずお問い合わせを受け付けられない"

    condition_threshold {
      # metric type は .name で参照する（.id は provider 差でフルパス化し得るため・#703 レビュー）
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.turnstile_unavailable.name}\" resource.type=\"cloud_run_revision\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = <<-EOT
    # お問い合わせフォームの Turnstile を確かめられない

    Turnstile を使えないため、お問い合わせを受け付けられていません（fail closed）。
    続いている間は、お問い合わせが全部届きません。メトリクスのラベル `alert` で原因を見分けます。

    ## alert = turnstile_site_key_missing（サイトキーの設定漏れ）
    フォームが「送信前の確認を読み込めませんでした」と表示され、送信できません。
    1. repo variable `TURNSTILE_SITE_KEY` が **Repository variables** にあるか
       （Secrets や Environment 変数に置くと Deploy Web から読まれない・SPR-398）
    2. 入れ直したら Deploy Web を手動で流す（Actions → Deploy Web → Run workflow）

    ## alert = turnstile_secret_missing（設定漏れ）
    1. Secret Manager の `TURNSTILE_SECRET_KEY` に有効なバージョンがあるか
    2. `deploy-web.yml` の `--set-secrets` に `TURNSTILE_SECRET_KEY` が残っているか
    3. Cloud Run を作り直した直後なら、Deploy Web を一度流す（bootstrap の env には含めていない）

    ## alert = turnstile_siteverify_unavailable（Cloudflare 側に届かない）
    1. Cloudflare のステータス（https://www.cloudflarestatus.com/）で Turnstile の障害を確認
    2. ログの `status`（HTTP エラー）か `error`（タイムアウト・通信失敗）を確認
    3. 障害が続く間は待つしかない（確かめずに通すと防御が無くなるため、fail open にはしない・SPR-398）

    ## ログ確認
    ```bash
    gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${var.cloud_run_service_name}" AND jsonPayload.alert=~"^turnstile_"' --project=PROJECT_ID --freshness=1d --limit=20
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.turnstile_unavailable
  ]
}
