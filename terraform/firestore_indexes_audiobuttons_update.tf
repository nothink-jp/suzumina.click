/**
 * AudioButton用の更新されたFirestoreインデックス定義
 * 
 * フィールド名変更対応:
 * - sourceVideoId → videoId
 * - playCount/likeCount → stats.playCount/stats.likeCount
 * - createdBy → creatorId
 */

# ===================================================================
# 新しいフィールド名でのインデックス定義
# ===================================================================

# audioButtons - videoId（昇順）、isPublic（昇順）、createdAt（降順）
# 動画詳細ページでの音声ボタン取得用
resource "google_firestore_index" "audiobuttons_videoid_ispublic_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioButtons - isPublic（昇順）、stats.playCount（降順）
resource "google_firestore_index" "audiobuttons_ispublic_stats_playcount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "stats.playCount"
    order      = "DESCENDING"
  }
}

# audioButtons - isPublic（昇順）、stats.likeCount（降順）
resource "google_firestore_index" "audiobuttons_ispublic_stats_likecount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "stats.likeCount"
    order      = "DESCENDING"
  }
}

# audioButtons - videoId（昇順）、isPublic（昇順）、stats.playCount（降順）
resource "google_firestore_index" "audiobuttons_videoid_ispublic_stats_playcount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "stats.playCount"
    order      = "DESCENDING"
  }
}

# audioButtons - videoId（昇順）、isPublic（昇順）、stats.likeCount（降順）
resource "google_firestore_index" "audiobuttons_videoid_ispublic_stats_likecount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "stats.likeCount"
    order      = "DESCENDING"
  }
}

# audioButtons - creatorId（昇順）、createdAt（降順）
resource "google_firestore_index" "audiobuttons_creatorid_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "creatorId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioButtons - creatorId（昇順）、createdAt（昇順）
# レート制限チェッククエリで使用（範囲クエリ対応）
resource "google_firestore_index" "audiobuttons_creatorid_createdat_asc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "creatorId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "ASCENDING"
  }
}

# ===================================================================
# 注意事項:
# ===================================================================
# 
# 1. 適用前に既存のインデックスをバックアップ:
#    gcloud firestore indexes composite list --database="(default)" > indexes_backup.txt
# 
# 2. 新しいインデックスを作成:
#    terraform apply -target=module.firestore_indexes_audiobuttons_update
# 
# 3. アプリケーションの動作確認後、古いインデックスを削除:
#    - firestore_indexes.tf の古いインデックス定義をコメントアウト
#    - terraform apply
# 
# 4. インデックス作成には時間がかかります（5-10分程度）