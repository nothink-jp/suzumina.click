# DLsiteヘルス監視スケジューラー設定

# DLsiteヘルス監視用Pub/Subトピック
resource "google_pubsub_topic" "dlsite_health_monitor_trigger" {
  project = var.gcp_project_id
  name    = "dlsite-health-monitor-trigger"
  
  labels = {
    environment = var.environment
    function    = "dlsite-health-monitor"
    managed-by  = "terraform"
  }

  depends_on = [google_project_service.pubsub]
}

# DLsiteヘルス監視スケジューラー（30分間隔）
resource "google_cloud_scheduler_job" "dlsite_health_monitor_30min" {
  project  = var.gcp_project_id
  region   = var.region
  name     = "dlsite-health-monitor-30min"
  
  description = "DLsiteヘルス監視（30分間隔・構造変更検知）"
  schedule    = "*/30 * * * *"  # 30分間隔実行（設計文書準拠）
  time_zone   = "Asia/Tokyo"
  paused      = false

  pubsub_target {
    topic_name = google_pubsub_topic.dlsite_health_monitor_trigger.id
    data       = base64encode(jsonencode({
      type = "health_check"
      mode = "structure_monitoring"
      description = "DLsite構造ヘルスチェック・パーサー健全性監視"
    }))
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_pubsub_topic.dlsite_health_monitor_trigger,
  ]
}

# Cloud Scheduler からDLsiteヘルス監視を呼び出すための権限
resource "google_pubsub_topic_iam_member" "scheduler_dlsite_health_pubsub_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.dlsite_health_monitor_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# DLsiteヘルス監視トピック情報
output "dlsite_health_monitor_topic_info" {
  value = {
    name = google_pubsub_topic.dlsite_health_monitor_trigger.name
    id   = google_pubsub_topic.dlsite_health_monitor_trigger.id
  }
  description = "DLsiteヘルス監視Pub/Subトピックの情報"
}