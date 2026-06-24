# ==============================================================================
# Firestore インデックス欠落の監視（SPR-213 再発防止 / Tier3）
# ==============================================================================
# 複合インデックスを要求するクエリが index 未定義で失敗すると
# `FAILED_PRECONDITION: The query requires an index` がログに出る。
# アプリ側に silent fallback（catch で握りつぶし）があるとこの欠落が表面化しないため、
# ログに index 要求エラーが出た時点で通知する。新規 where+orderBy のデプロイ漏れや、
# index 削除のリグレッション（誤って使用中 index を消した）を即検知する狙い。

# ログベースメトリクス - Firestore index 要求エラー
resource "google_logging_metric" "firestore_missing_index" {
  name    = "firestore_missing_index_errors"
  project = var.gcp_project_id

  # "requires an index" は index 欠落に固有のフレーズ（汎用の FAILED_PRECONDITION より誤検知が少ない）。
  # web(Cloud Run) と functions(Cloud Functions) の両方を対象にする。
  filter = <<-EOT
    (resource.type="cloud_run_revision" OR resource.type="cloud_function")
    "requires an index"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "Firestore missing-index errors"
  }
}

# Firestore index 欠落アラート（ログベースメトリクス使用）
resource "google_monitoring_alert_policy" "firestore_missing_index" {
  display_name = "Firestore Missing Index Alert"
  project      = var.gcp_project_id
  combiner     = "OR"

  conditions {
    display_name = "Firestore で index 要求エラー（FAILED_PRECONDITION）検出"

    condition_threshold {
      # .name（メトリクス名のみ）を使う。.id は provider バージョンで projects/.../metrics/ の
      # フルパスになり得て無効 metric type になるため、曖昧さのない .name に揃える（#703 レビュー）。
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.firestore_missing_index.name}\""

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
    # Firestore 複合インデックス欠落

    クエリが複合インデックスを要求して失敗しました（`FAILED_PRECONDITION: The query requires an index`）。

    ## 主な原因
    1. 新規 `where`+`orderBy` / `collectionGroup` クエリをデプロイしたが index 未追加
    2. index 削除のリグレッション（使用中 index を誤って撤去）
    3. フィールド/コレクション改名で旧 index と不一致

    ## 対応
    - `firestore_indexes*.tf` に必要な index を追加 or 復元（正本は terraform）
    - drift 点検: `pnpm check:index-drift`
    - 背景: SPR-213（クエリ→インデックス対応表）

    ## ログ確認
    ```bash
    gcloud logging read '"requires an index"' --project=PROJECT_ID --freshness=1d --limit=20
    ```
    EOT
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_notification_channel.email,
    google_logging_metric.firestore_missing_index
  ]
}
