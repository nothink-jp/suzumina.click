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
# クエリ→インデックス対応表・棚卸し記録: Linear SPR-213 を参照
# （定義の正本は本ファイル + firestore_indexes_audiobuttons_update.tf + live。旧 firestore_index_mapping.md は不在）

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
# 📈 PRICE HISTORY INDEXES - 価格履歴サブコレクション用
# ===================================================================

# works/{workId}/priceHistory サブコレクション
# price-history.ts の getPriceHistory() で使用
# 
# ⚠️ 注意: dateフィールドのみのインデックスは不要
# Firestoreの自動single-fieldインデックスで十分対応可能
# - date ASC/DESC: Single-field index（COLLECTION スコープ）で自動作成
# - Collection Group クエリ: 現在 collectionGroup("priceHistory") は未使用のため不要。
#   使う場合は google_firestore_field で COLLECTION_GROUP index を明示定義すること
#   （COLLECTION_GROUP スコープの単一フィールド index は自動生成されない。SPR-204 参照）
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

# creators サブコレクション works - Collection Group Query用
#
# 重要: COLLECTION_GROUP スコープの「単一フィールド」index は Firestore の自動生成対象外。
# 自動生成されるのは COLLECTION スコープの単一フィールド index のみで、
# collectionGroup("works").where("workId", "==", ...) のような CG 横断クエリには
# 明示的な single-field index 設定（exemption）が必須。無いと実行時に
# `9 FAILED_PRECONDITION: The query requires a COLLECTION_GROUP_ASC index ...` になる。
# 参照: apps/functions/src/services/dlsite/creator-firestore.ts getExistingCreatorMappings() / SPR-204
#
# 複合 index 専用の google_firestore_index ではなく、単一フィールド index 設定を扱う
# google_firestore_field で定義する。index_config は当該フィールドの index 構成を
# 「全置換」するため、既定の COLLECTION ASC/DESC を残したうえで COLLECTION_GROUP ASC を追加する。
resource "google_firestore_field" "works_workid_collection_group" {
  project    = var.gcp_project_id
  database   = "(default)"
  collection = "works"
  field      = "workId"

  index_config {
    # 既定（自動生成）の単一フィールド index を維持（明示しないと削除される）
    indexes {
      query_scope = "COLLECTION"
      order       = "ASCENDING"
    }
    indexes {
      query_scope = "COLLECTION"
      order       = "DESCENDING"
    }
    # 本対応で追加する Collection Group index（getExistingCreatorMappings 用）
    indexes {
      query_scope = "COLLECTION_GROUP"
      order       = "ASCENDING"
    }
  }
}

# （将来用・複合インデックスの例）役割と作品IDの組み合わせ検索用。
# 現在のクエリでは不要。必要になったら有効化する。
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

# ===================================================================
# 🆕 WORKS COLLECTION OPTIMIZATION INDEXES - パフォーマンス最適化用 (2025-08-01追加)
# ===================================================================

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
# 📊 SUMMARY - Terraform 管理インデックス（2026-06-24 SPR-213 で棚卸し）
# ===================================================================
#
# 本ファイルが管理する複合インデックスは「実クエリで使われるもの」に限定する。
# クエリ→インデックス対応の全体像・live との突合・削除記録は Linear SPR-213 を参照。
#
# 【管理対象（query-backed）】
# - works_category_*（6）: /works のカテゴリ閲覧（work-query-builder.ts。category 単独は simple path で
#   Firestore where(category)+orderBy を実行）
# - audiobuttons_ispublic_createdat_desc（1）: 音声ボタン一覧 newest / autocomplete tags
# - works.workId COLLECTION_GROUP（google_firestore_field・SPR-204）: creator-firestore.ts
# - ※ audioButtons の creatorId / stats.* / videoId 系は firestore_indexes_audiobuttons_update.tf が管理
#
# 【SPR-213 で本ファイルから撤去した managed-unused（13）】
# videos categoryId/liveBroadcast（×4）, works isR18 系（×2）, users isPublicProfile,
# audioButtons tags, contacts status/priority（×2）, circles name+workCount,
# works circleId+registDate, creators CG circleId+updatedAt
# → いずれもアプリが「全件取得 + in-memory フィルタ」のため where() 0 hit（SPR-88/161）
#
# 【管理方針】
# - 「terraform に定義がある＝使用中」ではない。追加時は実クエリの where+orderBy 形を必ず確認する
# - Emulator は複合インデックスを強制しないため、新規 where+orderBy は live/ADC 直結で要検証
# - live にあり config に無い未管理インデックスの削除は gcloud で実施（SPR-213 で別途）
