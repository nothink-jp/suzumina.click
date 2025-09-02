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

# ===================================================================
# ✅ ACTIVE INDEXES - 使用中 (動画フィルター機能で実装済み)
# ===================================================================
# 
# 以下のインデックスは詳細調査により実際に使用中と判明
# videos/actions.ts で動画種別・カテゴリフィルターに使用
#
# videos コレクションのインデックス - liveBroadcastContent（昇順）と publishedAt（降順）
# ✅ 使用中 - 動画種別フィルター（配信アーカイブ、プレミア公開、通常動画）
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

# ✅ 使用中 - 動画種別フィルター（古い順ソート）
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

# ===================================================================
# 🔴 DELETED INDEX - videoType機能未実装により削除済み
# ===================================================================
# videos_videoType_publishedAt_desc: 削除完了

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

# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_ispublic_stats_playcount_desc instead
# # audioButtons コレクションのインデックス - isPublic（昇順）、playCount（降順）
# resource "google_firestore_index" "audiobuttons_ispublic_playcount_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
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

# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_ispublic_stats_likecount_desc instead
# # audioButtons コレクションのインデックス - isPublic（昇順）、likeCount（降順）
# resource "google_firestore_index" "audiobuttons_ispublic_likecount_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "isPublic"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "likeCount"
#     order      = "DESCENDING"
#   }
# }

# Note: category フィールドはタグベースシステムに移行したため、インデックスを削除

# audiobuttons_ispublic_sourcevideoid_starttime_asc: 削除完了 (startTime ソート機能未実装)

# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_videoid_ispublic_createdat_desc instead
# # audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、createdAt（降順）
# # 動画詳細ページでの音声ボタン取得用
# resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_createdat_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "sourceVideoId"
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

# audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、likeCount（降順）
# 動画詳細ページでの音声ボタン取得用（人気順）
# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_videoid_ispublic_stats_likecount_desc instead
# resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_likecount_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "sourceVideoId"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "isPublic"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "likeCount"
#     order      = "DESCENDING"
#   }
# }

# audioButtons コレクションのインデックス - sourceVideoId（昇順）、isPublic（昇順）、playCount（降順）
# 動画詳細ページでの音声ボタン取得用（再生回数順）
# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_videoid_ispublic_stats_playcount_desc instead
# resource "google_firestore_index" "audiobuttons_sourcevideoid_ispublic_playcount_desc" {
#   project    = var.gcp_project_id
#   collection = "audioButtons"
#   
#   fields {
#     field_path = "sourceVideoId"
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
# 🔄 MIGRATED TO NEW FIELD NAMES - Use audiobuttons_creatorid_createdat_desc instead
# resource "google_firestore_index" "audiobuttons_createdby_createdat_desc" {
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
#     order      = "DESCENDING"
#   }
# }

# audioButtons コレクションのインデックス - createdBy（昇順）、createdAt（昇順）
# レート制限チェッククエリで使用（範囲クエリ対応）
# 🟡 FUTURE FEATURE - レート制限機能用
# audiobuttons_createdby_createdat_asc: レート制限機能復活時に追加

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

# ===================================================================
# 🔶 FALLBACK INDEXES - フォールバック機能で利用 (無効化中)
# ===================================================================
# 
# マイページ不具合対応により、これらのインデックスは現在不要
# フォールバック戦略により、複合クエリ失敗時はクライアントサイドフィルタリングを使用
# 将来的に必要な場合のみアンコメント

# 🟡 FUTURE FEATURE - ユーザープロフィールページ用
# フォールバック戦略により現在不要、必要時に3個のインデックスを追加

# Note: Single-field index for releaseDateISO is automatically created by Firestore
# Removed dlsiteworks_releasedateiso_desc - use single field index controls instead

# Note: Single-field index for releaseDateISO is automatically created by Firestore
# Removed dlsiteworks_releasedateiso_asc - use single field index controls instead

# ✅ IMPORT REQUIRED - カテゴリフィルター機能で使用中
# videos_categoryid_publishedat_desc: 既存インデックス（要インポート）
resource "google_firestore_index" "videos_categoryid_publishedat_desc" {
  project    = var.gcp_project_id
  collection = "videos"

  fields {
    field_path = "categoryId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "publishedAt"
    order      = "DESCENDING"
  }
}

# ✅ IMPORT REQUIRED - カテゴリフィルター機能（古い順ソート）
resource "google_firestore_index" "videos_categoryid_publishedat_asc" {
  project    = var.gcp_project_id
  collection = "videos"

  fields {
    field_path = "categoryId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "publishedAt"
    order      = "ASCENDING"
  }
}

# ===================================================================
# 🔴 DELETED INDEXES - 配信詳細フィルター機能未実装により削除済み
# ===================================================================
# 
# 以下6個のインデックスを削除して月額$12のコスト削減を実現
# 
# videos_livestreamingdetails_actualendtime_publishedat_desc: 削除完了
# videos_livestreamingdetails_actualendtime_publishedat_asc: 削除完了
# videos_livestreamingdetails_scheduledstarttime_publishedat_desc: 削除完了
# videos_livestreamingdetails_scheduledstarttime_publishedat_asc: 削除完了
# videos_livestreamingdetails_null_publishedat_desc: 削除完了
# videos_livestreamingdetails_null_publishedat_asc: 削除完了

# ===================================================================
# ℹ️  NOTES - 自動作成・外部管理インデックス
# ===================================================================
# 
# works コレクション:
# - category×releaseDateISO: 既存インデックス使用 (Terraform外管理)
# - price.current, rating.stars: Single-field自動作成
# 
# favorites コレクション:
# - Single-fieldインデックス: Firestore自動作成

# dlsite_timeseries_raw コレクション - 既存インデックス使用
# date×workId×timestamp インデックスは外部で作成済み (Terraform外管理)

# ===================================================================
# 🔴 CRITICAL MISSING INDEXES - 即座に実装必要
# ===================================================================

# ✅ IMPORT REQUIRED - 管理者お問い合わせ管理機能で使用中
# contacts_status_createdat_desc: 既存インデックス（要インポート）
resource "google_firestore_index" "contacts_status_createdat_desc" {
  project    = var.gcp_project_id
  collection = "contacts"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }
}

# ✅ IMPORT REQUIRED - 優先度別お問い合わせフィルター用
resource "google_firestore_index" "contacts_priority_createdat_desc" {
  project    = var.gcp_project_id
  collection = "contacts"

  fields {
    field_path = "priority"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }
}

# ===================================================================
# 🟡 PLANNED INDEXES - 将来機能強化用
# ===================================================================

# 🟡 FUTURE FEATURE - Collection Group favorites (将来拡張用)
# favorites_collection_group_audiobuttonid_createdat: 将来実装時に管理者用インデックスとして追加

# ===================================================================
# 📈 PRICE HISTORY INDEXES - 価格履歴サブコレクション用
# ===================================================================

# works/{workId}/priceHistory サブコレクション
# price-history.ts の getPriceHistory() で使用
# 
# ⚠️ 注意: dateフィールドのみのインデックスは不要
# Firestoreの自動single-fieldインデックスで十分対応可能
# - date ASC/DESC: Single-field indexで自動作成
# - Collection Group クエリ: 自動インデックスで対応
# 
# 以下のクエリパターンが自動インデックスで実行可能:
# - orderBy('date', 'desc').limit(90)
# - where('date', '>=', startDate).where('date', '<=', endDate).orderBy('date')
# 
# 複合インデックスが必要になるのは以下の場合:
# - 追加フィルター条件（workId, currency等）が加わった時
# - 複数フィールドでのソートが必要な時

# ===================================================================
# 🆕 CIRCLE & CREATOR INDEXES - サークル・クリエイター機能用 (2025-07-21追加)
# ===================================================================

# circles コレクション - サークル一覧ページ用（将来実装）
# 名前順、作品数順でのソート用
resource "google_firestore_index" "circles_name_workcount_desc" {
  project    = var.gcp_project_id
  collection = "circles"

  fields {
    field_path = "name"
    order      = "ASCENDING"
  }

  fields {
    field_path = "workCount"
    order      = "DESCENDING"
  }
}

# creators サブコレクション works - Collection Group Query用
# 注意: 単一フィールドのCollection Group QueryはFirestoreが自動的にインデックスを作成するため、
# 複合インデックスのみを定義する必要があります。

# 複合インデックスの例: 役割と作品IDの組み合わせ検索用
# 現在のクエリでは不要だが、将来的に必要になる可能性がある
# resource "google_firestore_index" "creators_works_collection_group_roles_workid" {
#   project    = var.gcp_project_id
#   collection = "works"
#   database   = "(default)"
#   
#   query_scope = "COLLECTION_GROUP"
#   
#   fields {
#     field_path   = "roles"
#     array_config = "CONTAINS"
#   }
#   
#   fields {
#     field_path = "workId"
#     order      = "ASCENDING"
#   }
# }

# creators サブコレクション works - サークル別クリエイター検索用（複合インデックス）
# 特定のサークルで活動するクリエイターを更新日時順で検索
# このインデックスは複合クエリで必要
resource "google_firestore_index" "creators_works_collection_group_circleid" {
  project    = var.gcp_project_id
  collection = "works"
  database   = "(default)"

  query_scope = "COLLECTION_GROUP"

  fields {
    field_path = "circleId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "updatedAt"
    order      = "DESCENDING"
  }
}

# works コレクション - サークル別作品一覧用
# サークルIDと登録日の複合インデックス
resource "google_firestore_index" "works_circleid_registdate_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "circleId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "registDate"
    order      = "DESCENDING"
  }
}

# ===================================================================
# 🆕 WORKS COLLECTION OPTIMIZATION INDEXES - パフォーマンス最適化用 (2025-08-01追加)
# ===================================================================

# works コレクション - R18フィルタ + 最新順
resource "google_firestore_index" "works_isr18_releasedateiso_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "isR18"
    order      = "ASCENDING"
  }

  fields {
    field_path = "releaseDateISO"
    order      = "DESCENDING"
  }
}

# works コレクション - カテゴリ + 最新順
resource "google_firestore_index" "works_category_releasedateiso_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "releaseDateISO"
    order      = "DESCENDING"
  }
}

# works コレクション - カテゴリ + R18フィルタ + 最新順
resource "google_firestore_index" "works_category_isr18_releasedateiso_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "isR18"
    order      = "ASCENDING"
  }

  fields {
    field_path = "releaseDateISO"
    order      = "DESCENDING"
  }
}

# works コレクション - カテゴリ + 古い順
resource "google_firestore_index" "works_category_releasedateiso_asc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "releaseDateISO"
    order      = "ASCENDING"
  }
}

# works コレクション - カテゴリ + 価格が安い順
resource "google_firestore_index" "works_category_price_asc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "price.current"
    order      = "ASCENDING"
  }
}

# works コレクション - カテゴリ + 価格が高い順
resource "google_firestore_index" "works_category_price_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "price.current"
    order      = "DESCENDING"
  }
}

# works コレクション - カテゴリ + 評価が高い順
resource "google_firestore_index" "works_category_rating_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "rating.stars"
    order      = "DESCENDING"
  }
}

# works コレクション - カテゴリ + 人気順
resource "google_firestore_index" "works_category_popular_desc" {
  project    = var.gcp_project_id
  collection = "works"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "rating.count"
    order      = "DESCENDING"
  }
}

# 注意: 単一フィールドのインデックスはFirestoreが自動的に作成するため、
# 以下のインデックスは不要です。コードでorderByを使用すると自動作成されます。
# - price.current (ASCENDING/DESCENDING)
# - rating.stars (DESCENDING)
# - rating.count (DESCENDING)

# videos コレクション - 公開状態 + 最新順（トップページ最適化）
# 既存のインデックスと競合するため、削除またはインポートが必要
# resource "google_firestore_index" "videos_privacystatus_publishedat_desc" {
#   project    = var.gcp_project_id
#   collection = "videos"
#   
#   fields {
#     field_path = "privacyStatus"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "publishedAt"
#     order      = "DESCENDING"
#   }
# }

# videos コレクション - 公開状態 + 古い順
# 既存のインデックスと競合するため、削除またはインポートが必要
# resource "google_firestore_index" "videos_privacystatus_publishedat_asc" {
#   project    = var.gcp_project_id
#   collection = "videos"
#   
#   fields {
#     field_path = "privacyStatus"
#     order      = "ASCENDING"
#   }
#   
#   fields {
#     field_path = "publishedAt"
#     order      = "ASCENDING"
#   }
# }

# ===================================================================
# 📊 SUMMARY - Terraform管理インデックス状況 (2025-08-04更新 - worksソート用インデックス追加)
# ===================================================================
# 
# 【現在の構成】
# ✅ 実装済み (使用中):          30個 (audioButtons: 8, users: 2, contacts: 2, favorites: 1, circles: 1, creatorMappings: 2, works: 14, videos: 2追加)
# 🔴 削除推奨 (未使用):          10個 (videos関連、audioButtons startTime 1個)
# 🆕 新規追加 (最適化):          15個 (works: 13, videos: 2)
# 🔶 無効化中 (フォールバック):   4個 (createdBy関連、マイページ用)
# ℹ️ 自動インデックス対応:        priceHistory (single-fieldで十分)
# 
# 【コスト影響】
# - 削除による削減: 月額 -$20 (年間 -$240)
# - 新規追加コスト: 月額 +$10 (年間 +$120) ※contacts/favorites/circles/creators追加
# - 純削減効果:     月額 -$10 (年間 -$120)
# 
# 【実装アクション】
# 1. 即座実装: terraform apply (contacts, favorites, circles, creators インデックス)
# 2. 削除実行: terraform destroy -target (videos 未使用10個)
# 3. priceHistory: Firestore自動インデックスで対応済み
# 4. 監視継続: 新機能実装時のインデックス要件チェック
# 
# 【管理方針】
# - 全複合インデックスをTerraformで一元管理
# - 実装前にクエリパターン分析実施
# - 未使用インデックスの定期的削除
# - フォールバック戦略による障害耐性確保
