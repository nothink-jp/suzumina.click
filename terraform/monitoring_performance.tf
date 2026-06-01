/**
 * monitoring_performance.tf
 * パフォーマンス監視ダッシュボードとアラート
 */
# パフォーマンス関連のアラート - 高レイテンシ
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "高レイテンシ検知アラート"
  combiner     = "OR"

  conditions {
    display_name = "P95レイテンシが閾値超過 (> 10000ms)"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s" # 5分間継続（データ不足対応）
      comparison      = "COMPARISON_GT"
      threshold_value = 10000 # 10秒（コールドスタート許容）

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # 高レイテンシ検知アラート（個人開発版・P95）
    
    Next.jsアプリケーションのP95レスポンス時間が10秒を超えました。
    コールドスタートを考慮した閾値に調整済み。
    
    ## 対応アクション
    1. Cloud Loggingで遅いクエリを特定
    2. Firestoreインデックスの最適化確認
    3. Next.js App Routerのキャッシュ設定確認
    4. 必要に応じてインスタンス数調整
    EOT
    mime_type = "text/markdown"
  }

  project    = var.gcp_project_id
  depends_on = [google_monitoring_notification_channel.email]
}

# CPU使用率高アラート
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "CPU使用率高アラート"
  combiner     = "OR"

  conditions {
    display_name = "CPU使用率が持続的に高い (> 95%)"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\""
      duration        = "600s" # 10分間継続
      comparison      = "COMPARISON_GT"
      threshold_value = 0.95 # 95%（個人開発・余裕持った設定）

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = <<-EOT
    # CPU使用率高アラート（個人開発版）
    
    Cloud RunでCPU使用率が95%を10分間継続しています。
    パフォーマンス低下やコスト増加の可能性があります。
    
    ## 対応アクション
    1. CPU使用率の詳細分析
    2. 非効率なコードの特定
    3. Next.js最適化（静的生成活用等）
    4. リソース上限の見直し
    EOT
    mime_type = "text/markdown"
  }

  project    = var.gcp_project_id
  depends_on = [google_monitoring_notification_channel.email]
}

# メモリ使用率高アラート（簡素化版・95%閾値）
resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "メモリ使用率高アラート"
  combiner     = "OR"

  conditions {
    display_name = "メモリ使用率が危険レベル (> 95%)"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"suzumina-click-web\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\""
      duration        = "600s" # 10分間継続（誤報削減）
      comparison      = "COMPARISON_GT"
      threshold_value = 0.95 # 95%（より厳しい閾値）

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = "メモリ使用率95%超過。緊急対応が必要です。"
    mime_type = "text/markdown"
  }

  project    = var.gcp_project_id
  depends_on = [google_monitoring_notification_channel.email]
}

# Firestoreクエリパフォーマンスアラート
# Firestore metrics not available yet - can be enabled later
/*
resource "google_monitoring_alert_policy" "slow_firestore_queries" {
  display_name = "Firestoreクエリ遅延アラート"
  combiner     = "OR"
  
  conditions {
    display_name = "Firestore読み取りレイテンシ高 (P95 > 500ms)"
    
    condition_threshold {
      filter          = "resource.type=\"firestore_instance\" AND metric.type=\"firestore.googleapis.com/api/request_latencies\""
      duration        = "300s"  # 5分間継続
      comparison      = "COMPARISON_GT"
      threshold_value = 500     # 500ms
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
      
      trigger {
        count = 1
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]
  
  documentation {
    content = <<-EOT
    # Firestoreクエリ遅延アラート
    
    Firestoreの読み取りレイテンシが500msを超えています。
    データベースパフォーマンスに問題があります。
    
    ## 対応アクション
    1. 遅いクエリの特定（Cloud Loggingで確認）
    2. 複合インデックスの確認・追加
    3. クエリの最適化（limit、orderBy活用）
    4. ページネーションの実装確認
    EOT
    mime_type = "text/markdown"
  }
  
  project = local.project_id
  depends_on = [google_monitoring_notification_channel.email]
}
*/