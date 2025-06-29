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

# Note: category フィールドはタグベースシステムに移行したため、インデックスを削除

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

# audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、createdAt（降順）
# 動画詳細ページでの音声ボタン取得用
resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "sourceVideoId"
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

# audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、likeCount（降順）
# 動画詳細ページでの音声ボタン取得用（人気順）
resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_likecount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "sourceVideoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "likeCount"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、playCount（降順）
# 動画詳細ページでの音声ボタン取得用（再生回数順）
resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_playcount_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "sourceVideoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "playCount"
    order      = "DESCENDING"
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

# audioButtons コレクションのインデックス - createdBy（昇順）、createdAt（降順）
resource "google_firestore_index" "audiobuttons_createdby_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioButtons"
  
  fields {
    field_path = "createdBy"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioButtons コレクションのインデックス - createdBy（昇順）、createdAt（昇順）
# レート制限チェッククエリで使用（範囲クエリ対応）
# TODO: インデックス作成の問題により一時的に無効化
# resource "google_firestore_index" "audiobuttons_createdby_createdat_asc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "createdBy"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "createdAt"
#     order      = "ASCENDING"
#   }
# }

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

# audioButtons コレクションのインデックス - createdBy（昇順）、isPublic（昇順）、createdAt（降順）
# ユーザープロフィールページでの音声ボタン取得用（最新順）
# TODO: インデックス作成の問題により一時的に無効化
# resource "google_firestore_index" "audiobuttons_createdby_ispublic_createdat_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "createdBy"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "isPublic"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "createdAt"
#     order      = "DESCENDING"
#   }
# }

# audioButtons コレクションのインデックス - createdBy（昇順）、isPublic（昇順）、createdAt（昇順）
# ユーザープロフィールページでの音声ボタン取得用（古い順）
# TODO: インデックス作成の問題により一時的に無効化
# resource "google_firestore_index" "audiobuttons_createdby_ispublic_createdat_asc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "createdBy"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "isPublic"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "createdAt"
#     order      = "ASCENDING"
#   }
# }

# audioButtons コレクションのインデックス - createdBy（昇順）、isPublic（昇順）、playCount（降順）
# ユーザープロフィールページでの音声ボタン取得用（再生回数順）
# TODO: インデックス作成の問題により一時的に無効化
# resource "google_firestore_index" "audiobuttons_createdby_ispublic_playcount_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "createdBy"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "isPublic"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "playCount"
#     order      = "DESCENDING"
#   }
# }

# Note: Single-field indexes for favorites collection are created automatically by Firestore
# Complex queries requiring composite indexes would be added here if needed
