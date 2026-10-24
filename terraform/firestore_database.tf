# ==============================================================================
# Cloud Firestore データベース設定
# ==============================================================================
# 概要: Cloud Firestore データベース本体と、その保全設定（PITR・削除保護・日次バックアップ・TTL）を定義
# 注意: API有効化は api_services.tf で一元管理されています
# 復元手順は docs/guides/deployment.md の「ロールバック」節が正本（SPR-342）
# ==============================================================================

# Cloud Firestore データベース (Native mode)
# Firestore API が有効になってから作成
resource "google_firestore_database" "database" {
  project     = var.gcp_project_id
  name        = "(default)"        # デフォルトデータベースの標準名称
  location_id = var.region         # 他のリソースと同じリージョン
  type        = "FIRESTORE_NATIVE" # Firestoreネイティブモードを使用

  # 直近 7 日間を 1 分単位で読み戻せる（復元は別 DB へ clone してから必要な doc だけ戻す）。
  # 料金は DB サイズ × PITR 単価（Tokyo $0.195/GiB 月）。DB は SPR-323 で約 1 GiB に縮小済み。
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"

  # DB の削除 API を拒否する。消すには先にこれを DISABLED にして apply する必要がある（意図的な 2 段階）。
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  depends_on = [
    google_project_service.firestore,
  ]
}

# 日次バックアップ。PITR（7 日）より古い時点まで戻れるよう保持は 14 日にする。
# 料金は 1 回分の DB サイズ × 保持日数ぶん（Tokyo $0.038/GiB 月）。復元先は常に新しい DB。
resource "google_firestore_backup_schedule" "daily" {
  project  = var.gcp_project_id
  database = google_firestore_database.database.name

  retention = "1209600s" # 14 日

  daily_recurrence {}
}

# better-auth の期限切れセッションを自動削除する（放置すると溜まり続ける）。
# expiresAt は adapter が Date で書くため Firestore では Timestamp になり、TTL の対象にできる。
# 削除は期限切れから通常 24 時間以内（即時ではない）。better-auth は期限切れセッションを無効として扱うので挙動は変わらない。
# index_config を書かない＝単一フィールド index は既定（継承）のまま。
resource "google_firestore_field" "ba_session_expires_at_ttl" {
  project    = var.gcp_project_id
  database   = google_firestore_database.database.name
  collection = "ba_session"
  field      = "expiresAt"

  ttl_config {}
}
