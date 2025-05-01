/**
 * Firestore インデックス定義
 * 
 * このファイルでは、FirestoreのインデックスをTerraformで管理しています。
 * 各インデックスは google_firestore_index リソースとして定義されています。
 */

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

# audioClips コレクションのインデックス - isPublic（昇順）、videoId（昇順）と createdAt（降順）
resource "google_firestore_index" "audioclips_ispublic_videoid_createdat_desc" {
  project    = var.gcp_project_id
  collection = "audioClips"
  
  fields {
    field_path = "isPublic"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# audioClips コレクションのインデックス - videoId（昇順）、createdAt（昇順）
resource "google_firestore_index" "audioclips_videoid_createdat_asc" {
  project    = var.gcp_project_id
  collection = "audioClips"
  
  fields {
    field_path = "videoId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "ASCENDING"
  }
}
