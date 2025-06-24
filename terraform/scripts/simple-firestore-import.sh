#!/bin/bash

# Simple Firestore Index Import Script
# 既存のFirestoreインデックスを確認して手動インポート用のコマンドを表示

set -e

# プロジェクトIDを取得
PROJECT_ID=$(grep 'gcp_project_id' terraform.tfvars | cut -d'"' -f2 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ terraform.tfvars からプロジェクトIDを取得できませんでした"
    echo "手動でプロジェクトIDを入力してください:"
    read -p "プロジェクトID: " PROJECT_ID
fi

echo "🔍 プロジェクト: $PROJECT_ID"
echo ""

# Firestoreが有効か確認
echo "📋 Firestoreインデックスを確認中..."

# 簡単なインデックス一覧表示
if gcloud firestore indexes composite list --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "✅ Firestoreにアクセス可能です"
    echo ""
    
    # インデックス一覧を表示
    echo "📊 既存のcompositeインデックス:"
    gcloud firestore indexes composite list --project="$PROJECT_ID" --format="table(name:label=INDEX_NAME,collectionGroup:label=COLLECTION,state:label=STATUS)" 2>/dev/null || {
        echo "❌ Compositeインデックスの取得に失敗しました"
    }
    
    echo ""
    echo "🔧 手動インポート手順:"
    echo ""
    echo "1. 以下のコマンドで各インデックスの詳細名を取得:"
    echo "   gcloud firestore indexes composite list --project=\"$PROJECT_ID\" --format=\"value(name)\""
    echo ""
    echo "2. 出力された各インデックス名を使用してインポート:"
    echo "   terraform import google_firestore_index.RESOURCE_NAME 'INDEX_FULL_PATH'"
    echo ""
    echo "例:"
    echo "   terraform import google_firestore_index.audioreferences_ispublic_createdat_desc 'projects/$PROJECT_ID/databases/(default)/collectionGroups/audioReferences/indexes/YOUR_INDEX_ID'"
    echo ""
    
    # インデックス詳細名を取得
    echo "📝 詳細インデックス名:"
    gcloud firestore indexes composite list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | while read -r index_name; do
        echo "   $index_name"
    done
    
else
    echo "❌ Firestoreへのアクセスに失敗しました"
    echo "以下を確認してください:"
    echo "1. プロジェクトIDが正しいか"
    echo "2. gcloud auth login が実行済みか"
    echo "3. 必要な権限があるか"
    exit 1
fi

echo ""
echo "💡 推奨手順:"
echo "1. 上記のインデックス名をコピー"
echo "2. 適切なterraform importコマンドを実行"
echo "3. terraform plan で状態確認"
echo "4. make apply で変更適用"