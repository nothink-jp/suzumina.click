/**
 * Firestore インデックス定義
 * 
 * このファイルでは、FirestoreのインデックスをTerraformで管理しています。
 * 各インデックスは google_firestore_index リソースとして定義されています。
 * 
 * 既存インデックスのインポート方法:
 * terraform import google_firestore_index.{resource_name} projects/{project_id}/databases/(default)/collectionGroups/{collection}/indexes/{index_id}
 */

# 既存のFirestoreインデックス管理について
# 注意: google_firestore_indexesデータソースは存在しないため、
# 既存インデックスの管理は手動インポートまたはスクリプトで行う
# 詳細: terraform/firestore_index_mapping.md を参照

# videos コレクションのインデックス - liveBroadcastContent（昇順）と publishedAt（降順）
resource "google_firestore_index" "videos_liveBroadcast_publishedAt_desc" {
  project    = var.gcp_project_id
  collection = "videos"
  
  fields {
    field_path = "liveBroadcastContent"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "publishedAt"
    order      = "DESCENDING"
  }
}

# videos コレクションのインデックス - liveBroadcastContent（昇順）と publishedAt（昇順）
resource "google_firestore_index" "videos_liveBroadcast_publishedAt_asc" {
  project    = var.gcp_project_id
  collection = "videos"
  
  fields {
    field_path = "liveBroadcastContent"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "publishedAt"
    order      = "ASCENDING"
  }
}

# videos コレクションのインデックス - videoType（昇順）、publishedAt（降順）、__name__（降順）
resource "google_firestore_index" "videos_videoType_publishedAt_desc" {
  project    = var.gcp_project_id
  collection = "videos"
  
  fields {
    field_path = "videoType"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "publishedAt"
    order      = "DESCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - isPublic（昇順）、createdAt（降順）
resource "google_firestore_index" "audiobuttons_ispublic_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - isPublic（昇順）、playCount（降順）
resource "google_firestore_index" "audiobuttons_ispublic_playcount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "playCount"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - isPublic（昇順）、likeCount（降順）
resource "google_firestore_index" "audiobuttons_ispublic_likecount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "likeCount"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - isPublic（昇順）、category（昇順）、createdAt（降順）
resource "google_firestore_index" "audiobuttons_ispublic_category_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "category"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - isPublic（昇順）、sourceVideoId（昇順）、startTime（昇順）
resource "google_firestore_index" "audiobuttons_ispublic_sourcevideoid_starttime_asc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "sourceVideoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "startTime"
    order      = "ASCENDING"
  }
}

# audioButtons コレクションのインデックス - tags（配列）、isPublic（昇順）、createdAt（降順）
resource "google_firestore_index" "audiobuttons_tags_ispublic_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path   = "tags"
    array_config = "CONTAINS"
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

# audioReferences コレクションのインデックス - isPublic（昇順）、createdAt（降順）
resource "google_firestore_index" "audioreferences_ispublic_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioReferences"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioReferences コレクションのインデックス - createdBy（昇順）、createdAt（降順）
resource "google_firestore_index" "audioreferences_createdby_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioReferences"
  
  fields {
    field_path = "createdBy"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioReferences コレクションのインデックス - isPublic（昇順）、playCount（降順）
resource "google_firestore_index" "audioreferences_ispublic_playcount_desc" {
  project    = var.gcp_project_id
  collection = "audioReferences"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "playCount"
    order      = "DESCENDING"
  }
}

# audioReferences コレクションのインデックス - isPublic（昇順）、category（昇順）、createdAt（降順）
resource "google_firestore_index" "audioreferences_ispublic_category_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioReferences"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "category"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioReferences コレクションのインデックス - isPublic（昇順）、videoId（昇順）、startTime（昇順）
resource "google_firestore_index" "audioreferences_ispublic_videoid_starttime_asc" {
  project    = var.gcp_project_id
  collection = "audioReferences"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "startTime"
    order      = "ASCENDING"
  }
}

# users コレクションのインデックス - isPublicProfile（昇順）、createdAt（降順）
resource "google_firestore_index" "users_ispublicprofile_createdat_desc" {
  project    = var.gcp_project_id
  collection = "users"
  
  fields {
    field_path = "isPublicProfile"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# users コレクションのインデックス - isPublicProfile（昇順）、role（昇順）、lastLoginAt（降順）
resource "google_firestore_index" "users_ispublicprofile_role_lastloginat_desc" {
  project    = var.gcp_project_id
  collection = "users"
  
  fields {
    field_path = "isPublicProfile"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "role"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "lastLoginAt"
    order      = "DESCENDING"
  }
}
