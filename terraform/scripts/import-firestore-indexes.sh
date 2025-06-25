#!/bin/bash

# Firestore Indexes Import Script
# 既存のFirestoreインデックスをTerraformにインポートする

set -e

# 色付きメッセージ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# プロジェクトIDを取得
PROJECT_ID=$(grep 'gcp_project_id' terraform.tfvars | cut -d'"' -f2)

if [ -z "$PROJECT_ID" ]; then
    log_error "terraform.tfvars からプロジェクトIDを取得できませんでした"
    exit 1
fi

log_info "プロジェクトID: $PROJECT_ID"

# 既存インデックスを取得する関数
get_existing_indexes() {
    local collection="$1"
    log_info "コレクション '$collection' の既存インデックスを取得中..."
    
    gcloud firestore indexes composite list \
        --project="$PROJECT_ID" \
        --filter="collectionGroup:$collection" \
        --format="value(name)" 2>/dev/null || {
        log_warn "コレクション '$collection' のインデックスが見つからないか、アクセスできません"
        return 1
    }
}

# インデックスをインポートする関数
import_index() {
    local terraform_resource="$1"
    local index_name="$2"
    
    log_step "インポート中: $terraform_resource"
    log_info "インデックス名: $index_name"
    
    if terraform import "$terraform_resource" "$index_name"; then
        log_info "✅ インポート成功: $terraform_resource"
    else
        log_warn "⚠️ インポート失敗: $terraform_resource (既にインポート済みの可能性)"
    fi
    echo ""
}

# audioButtons コレクションのインデックスをインポート
log_step "audioButtons コレクションのインデックスをインポート開始..."

# 既存インデックスを取得
AUDIO_INDEXES=$(get_existing_indexes "audioButtons")

if [ -n "$AUDIO_INDEXES" ]; then
    log_info "見つかったaudioButtonsインデックス:"
    echo "$AUDIO_INDEXES" | while read -r index; do
        echo "  - $index"
    done
    echo ""
    
    # 各インデックスをマッチングしてインポート
    echo "$AUDIO_INDEXES" | while read -r index; do
        case "$index" in
            *"isPublic,ASCENDING createdAt,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_ispublic_createdat_desc" "$index"
                ;;
            *"createdBy,ASCENDING createdAt,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_createdby_createdat_desc" "$index"
                ;;
            *"isPublic,ASCENDING playCount,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_ispublic_playcount_desc" "$index"
                ;;
            *"isPublic,ASCENDING likeCount,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_ispublic_likecount_desc" "$index"
                ;;
            *"isPublic,ASCENDING category,ASCENDING createdAt,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_ispublic_category_createdat_desc" "$index"
                ;;
            *"isPublic,ASCENDING sourceVideoId,ASCENDING startTime,ASCENDING"*)
                import_index "google_firestore_index.audiobuttons_ispublic_sourcevideoid_starttime_asc" "$index"
                ;;
            *"tags,CONTAINS isPublic,ASCENDING createdAt,DESCENDING"*)
                import_index "google_firestore_index.audiobuttons_tags_ispublic_createdat_desc" "$index"
                ;;
            *)
                log_info "未定義のインデックス: $index"
                ;;
        esac
    done
fi

# users コレクションのインデックスをインポート
log_step "users コレクションのインデックスをインポート開始..."

USER_INDEXES=$(get_existing_indexes "users")

if [ -n "$USER_INDEXES" ]; then
    log_info "見つかったusersインデックス:"
    echo "$USER_INDEXES" | while read -r index; do
        echo "  - $index"
    done
    echo ""
    
    # 各インデックスをマッチングしてインポート
    echo "$USER_INDEXES" | while read -r index; do
        case "$index" in
            *"isPublicProfile,ASCENDING createdAt,DESCENDING"*)
                import_index "google_firestore_index.users_ispublicprofile_createdat_desc" "$index"
                ;;
            *"isPublicProfile,ASCENDING role,ASCENDING lastLoginAt,DESCENDING"*)
                import_index "google_firestore_index.users_ispublicprofile_role_lastloginat_desc" "$index"
                ;;
            *)
                log_info "未定義のusersインデックス: $index"
                ;;
        esac
    done
fi

log_info "🎉 Firestoreインデックスのインポート処理が完了しました"
log_info "次に 'terraform plan' を実行して状態を確認してください"