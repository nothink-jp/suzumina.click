#!/bin/bash

# Firestore Indexes Listing Script
# 既存のFirestoreインデックスを表示して、インポートコマンドを生成

set -e

# プロジェクトIDを取得
PROJECT_ID=$(grep 'gcp_project_id' terraform.tfvars | cut -d'"' -f2)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ terraform.tfvars からプロジェクトIDを取得できませんでした"
    exit 1
fi

echo "🔍 プロジェクト '$PROJECT_ID' のFirestoreインデックスを確認中..."
echo ""

# 全インデックスをリスト
echo "📋 既存のFirestoreインデックス一覧:"
gcloud firestore indexes composite list --project="$PROJECT_ID" --format="table(name,collectionGroup,fields.list():label=FIELDS,state)"

echo ""
echo "🚀 インポートコマンド例:"
echo ""

# audioButtons コレクションのインデックス
echo "# audioButtons コレクション"
gcloud firestore indexes composite list \
    --project="$PROJECT_ID" \
    --filter="collectionGroup:audioButtons" \
    --format="value(name)" | while read -r index; do
    
    if [[ $index == *"isPublic"*"createdAt"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_ispublic_createdat_desc '$index'"
    elif [[ $index == *"createdBy"*"createdAt"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_createdby_createdat_desc '$index'"
    elif [[ $index == *"isPublic"*"playCount"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_ispublic_playcount_desc '$index'"
    elif [[ $index == *"isPublic"*"likeCount"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_ispublic_likecount_desc '$index'"
    elif [[ $index == *"isPublic"*"category"*"createdAt"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_ispublic_category_createdat_desc '$index'"
    elif [[ $index == *"isPublic"*"sourceVideoId"*"startTime"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_ispublic_sourcevideoid_starttime_asc '$index'"
    elif [[ $index == *"tags"*"isPublic"*"createdAt"* ]]; then
        echo "terraform import google_firestore_index.audiobuttons_tags_ispublic_createdat_desc '$index'"
    else
        echo "# 未定義のインデックス: $index"
    fi
done

echo ""

# users コレクションのインデックス
echo "# users コレクション"
gcloud firestore indexes composite list \
    --project="$PROJECT_ID" \
    --filter="collectionGroup:users" \
    --format="value(name)" | while read -r index; do
    
    if [[ $index == *"isPublicProfile"*"createdAt"* ]]; then
        echo "terraform import google_firestore_index.users_ispublicprofile_createdat_desc '$index'"
    elif [[ $index == *"isPublicProfile"*"role"*"lastLoginAt"* ]]; then
        echo "terraform import google_firestore_index.users_ispublicprofile_role_lastloginat_desc '$index'"
    else
        echo "# 未定義のusersインデックス: $index"
    fi
done

echo ""
echo "💡 これらのコマンドを実行後、'terraform plan' で状態を確認してください"