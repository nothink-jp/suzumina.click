#!/bin/bash

# suzumina.click Cloud Run デプロイスクリプト
# 使用法: ./scripts/deploy-cloud-run.sh [environment]

set -e

# デフォルト値
ENVIRONMENT=${1:-production}
PROJECT_ID="suzumina-click-firebase"
REGION="asia-northeast1"
SERVICE_NAME="suzumina-click-web"
REPOSITORY="suzumina-click"
IMAGE_NAME="nextjs-app"

echo "🚀 Cloud Run デプロイ開始"
echo "環境: $ENVIRONMENT"
echo "プロジェクト: $PROJECT_ID"
echo "リージョン: $REGION"

# プロジェクトディレクトリに移動
cd "$(dirname "$0")/.."

# 依存関係のインストール
echo "📦 依存関係のインストール..."
pnpm install --frozen-lockfile

# 共有パッケージのビルド
echo "🔨 共有パッケージのビルド..."
pnpm --filter @suzumina.click/shared-types build
pnpm --filter @suzumina.click/ui build

# テスト実行
echo "🧪 テスト実行..."
pnpm --filter web test

# リント実行
echo "🔍 コード品質チェック..."
pnpm --filter web lint
pnpm --filter web typecheck

# Google Cloud認証確認
echo "🔐 Google Cloud認証確認..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Google Cloud認証が必要です"
    echo "以下のコマンドを実行してください:"
    echo "  gcloud auth application-default login"
    exit 1
fi

# プロジェクト設定確認
echo "🏗️ プロジェクト設定確認..."
gcloud config set project $PROJECT_ID

# Docker認証設定
echo "🐳 Docker認証設定..."
gcloud auth configure-docker $REGION-docker.pkg.dev

# イメージタグ生成
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:$ENVIRONMENT-$TIMESTAMP-$COMMIT_SHA"
LATEST_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:latest"

echo "📦 Dockerイメージビルド..."
echo "イメージタグ: $IMAGE_TAG"

cd apps/web

# Dockerイメージビルド
docker build \
    --platform linux/amd64 \
    --tag $IMAGE_TAG \
    --tag $LATEST_TAG \
    .

# イメージプッシュ
echo "📤 イメージプッシュ..."
docker push $IMAGE_TAG
docker push $LATEST_TAG

# Cloud Runデプロイ
echo "🚀 Cloud Runデプロイ..."

gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --memory 2Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --port 3000 \
    --service-account "cloud-run-nextjs@$PROJECT_ID.iam.gserviceaccount.com"

# サービスURL取得
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)')

echo "✅ デプロイ完了!"
echo "🌐 サービスURL: $SERVICE_URL"

# ヘルスチェック
echo "🏥 ヘルスチェック実行..."
sleep 30

for i in {1..5}; do
    if curl -f "$SERVICE_URL/api/health"; then
        echo "✅ ヘルスチェック成功"
        echo ""
        echo "🎉 デプロイ成功!"
        echo "🌐 アプリケーション: $SERVICE_URL"
        echo "🏥 ヘルスチェック: $SERVICE_URL/api/health"
        exit 0
    else
        echo "❌ ヘルスチェック失敗 (試行 $i/5)"
        sleep 10
    fi
done

echo "❌ ヘルスチェック失敗: デプロイを確認してください"
echo "ログ確認: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit 50"
exit 1