#!/bin/bash

# Cloud Functions リビジョンクリーンアップスクリプト
# 使用法: ./scripts/cleanup-function-revisions.sh [keep_count]

set -e

# デフォルト値
PROJECT_ID=${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast1"}
KEEP_COUNT=${1:-5}  # 保持するリビジョン数（デフォルト: 5）

# Function名の配列
FUNCTIONS=("fetchyoutubevideos" "fetchdlsiteworks")

# プロジェクトID必須チェック
if [ -z "$PROJECT_ID" ]; then
    echo "❌ エラー: GCPプロジェクトIDが設定されていません"
    echo "以下のいずれかを実行してください:"
    echo "  export GCP_PROJECT_ID=your-project-id"
    echo "  export GOOGLE_CLOUD_PROJECT=your-project-id"
    echo "  gcloud config set project your-project-id"
    exit 1
fi

echo "🧹 Cloud Functions リビジョンクリーンアップ開始"
echo "プロジェクト: $PROJECT_ID"
echo "リージョン: $REGION"
echo "保持するリビジョン数: $KEEP_COUNT"
echo ""

# 各Functionのリビジョンをクリーンアップ
for function_name in "${FUNCTIONS[@]}"; do
    echo "📦 処理中: $function_name"
    
    # 現在のリビジョン一覧を取得（作成日時でソート、新しい順）
    revisions=$(gcloud run revisions list \
        --service="$function_name" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --sort-by="~metadata.creationTimestamp" \
        --format="value(metadata.name)" \
        --limit=50)
    
    if [ -z "$revisions" ]; then
        echo "  ⚠️  リビジョンが見つかりません"
        continue
    fi
    
    # リビジョンの配列に変換
    revision_array=($revisions)
    total_count=${#revision_array[@]}
    
    echo "  📊 総リビジョン数: $total_count"
    
    if [ $total_count -le $KEEP_COUNT ]; then
        echo "  ✅ リビジョン数が保持数以下のため、削除不要"
        continue
    fi
    
    # 削除対象のリビジョン（古いもの）
    delete_count=$((total_count - KEEP_COUNT))
    echo "  🗑️  削除対象: $delete_count リビジョン"
    
    # 削除実行
    deleted=0
    for ((i=KEEP_COUNT; i<total_count; i++)); do
        revision=${revision_array[$i]}
        echo "    削除中: $revision"
        
        if gcloud run revisions delete "$revision" \
            --region="$REGION" \
            --project="$PROJECT_ID" \
            --quiet; then
            deleted=$((deleted + 1))
        else
            echo "    ❌ 削除失敗: $revision"
        fi
    done
    
    echo "  ✅ 削除完了: $deleted/$delete_count リビジョン"
    echo ""
done

echo "🎉 クリーンアップ完了!"
echo ""
echo "📊 現在のリビジョン状況:"
for function_name in "${FUNCTIONS[@]}"; do
    echo ""
    echo "📦 $function_name:"
    gcloud run revisions list \
        --service="$function_name" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --sort-by="~metadata.creationTimestamp" \
        --limit=10
done