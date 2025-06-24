#!/bin/bash

# ⚠️  DEPRECATED: このスクリプトは非推奨です
# 代わりにGitHub Actionsベースのデプロイを使用してください
# 詳細: docs/GITHUB_ACTIONS_DEPLOYMENT.md
#
# suzumina.click Cloud Run デプロイスクリプト
# 使用法: ./scripts/deploy-cloud-run.sh [environment]

echo "⚠️  警告: このスクリプトは非推奨です"
echo "代わりにGitHub Actionsベースのデプロイを使用してください"
echo "詳細: docs/GITHUB_ACTIONS_DEPLOYMENT.md"
echo ""
echo "続行しますか？ (y/N)"
read -r confirmation
if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    echo "デプロイをキャンセルしました"
    exit 0
fi

set -e

# デフォルト値（環境変数から取得、GitHub Actions Secretsと互換）
ENVIRONMENT=${1:-production}
PROJECT_ID=${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast1"}
SERVICE_NAME=${CLOUD_RUN_SERVICE_NAME:-"suzumina-click-web"}
REPOSITORY=${ARTIFACT_REGISTRY_REPO:-"suzumina-click-web"}
IMAGE_NAME="web"

# プロジェクトID必須チェック
if [ -z "$PROJECT_ID" ]; then
    echo "❌ エラー: GCPプロジェクトIDが設定されていません"
    echo "以下のいずれかを実行してください:"
    echo "  # GitHub Actions Secrets互換"
    echo "  export GCP_PROJECT_ID=your-project-id"
    echo "  # 汎用環境変数"  
    echo "  export GOOGLE_CLOUD_PROJECT=your-project-id"
    echo "  # gcloud設定"
    echo "  gcloud config set project your-project-id"
    exit 1
fi

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

# リント実行（一時的に無効化）
echo "🔍 コード品質チェック..."
# pnpm --filter web lint
# pnpm --filter web typecheck

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

# Dockerイメージビルド（ルートディレクトリから実行）
docker build \
    --platform linux/amd64 \
    --tag $IMAGE_TAG \
    --tag $LATEST_TAG \
    -f apps/web/Dockerfile \
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
    --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NEXTAUTH_URL=https://suzumina.click,AUTH_TRUST_HOST=true" \
    --set-secrets="DISCORD_CLIENT_ID=DISCORD_CLIENT_ID:latest,DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET:latest,DISCORD_BOT_TOKEN=DISCORD_BOT_TOKEN:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest" \
    --memory 2Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --port 8080 \
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