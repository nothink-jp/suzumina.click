#!/bin/bash

# 最終動作テスト検証スクリプト
# 使用方法: ./scripts/verify-deployment.sh [評価環境|本番環境] [Cloud Runサービス名]

# エラーが発生した場合に停止
set -e

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数のチェック
ENV=${1:-"評価環境"}
if [ "$ENV" != "評価環境" ] && [ "$ENV" != "本番環境" ]; then
    echo -e "${RED}エラー: 環境名は「評価環境」または「本番環境」を指定してください${NC}"
    echo "使用方法: ./scripts/verify-deployment.sh [評価環境|本番環境] [Cloud Runサービス名]"
    exit 1
fi

# デプロイ環境の設定
DEPLOY_ENV="evaluation"
if [ "$ENV" == "本番環境" ]; then
    DEPLOY_ENV="production"
fi

# プロジェクトIDの設定
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}エラー: GCPプロジェクトIDが設定されていません。${NC}"
    echo "gcloud config set project [プロジェクトID] を実行してください。"
    exit 1
fi

# Cloud Runサービス名の設定
SERVICE_NAME=${2:-"suzumina-click-nextjs-app"}

# 利用可能なCloud Runサービスを確認
echo -e "${BLUE}Cloud Runサービスを確認しています...${NC}"
AVAILABLE_SERVICES=$(gcloud run services list --format="value(SERVICE)" --project=$PROJECT_ID 2>/dev/null || echo "")

# サービス名が指定されていない場合、利用可能なサービス一覧を表示
if [ -z "$2" ]; then
    echo -e "利用可能なCloud Runサービス:"
    echo "$AVAILABLE_SERVICES" | while read -r service; do
        if [ ! -z "$service" ]; then
            echo "  - $service"
        fi
    done
    echo ""
    echo -e "${YELLOW}サービス名が指定されていません。デフォルトの '$SERVICE_NAME' を使用します。${NC}"
    echo -e "特定のサービスを指定するには: ./scripts/verify-deployment.sh $ENV [Cloud Runサービス名]\n"
fi

# サービスが存在するか確認
if ! echo "$AVAILABLE_SERVICES" | grep -q "^$SERVICE_NAME$"; then
    echo -e "${RED}エラー: Cloud Runサービス '$SERVICE_NAME' が見つかりません${NC}"
    echo "利用可能なサービス:"
    echo "$AVAILABLE_SERVICES" | while read -r service; do
        if [ ! -z "$service" ]; then
            echo "  - $service"
        fi
    done
    echo -e "\n特定のサービスを指定するには: ./scripts/verify-deployment.sh $ENV [Cloud Runサービス名]"
    exit 1
fi

# サービスの状態を確認
SERVICE_STATUS=$(gcloud run services describe $SERVICE_NAME --platform managed --region asia-northeast1 --format="value(status.conditions[0].type)" --project=$PROJECT_ID 2>/dev/null || echo "")

if [ "$SERVICE_STATUS" != "Ready" ]; then
    echo -e "${RED}警告: サービス '$SERVICE_NAME' の状態が Ready ではありません (現在の状態: $SERVICE_STATUS)${NC}"
    echo -e "${YELLOW}サービスが正しく起動していない可能性があります。検証を続けますが、エラーが発生する可能性があります。${NC}\n"
fi

# Cloud Runサービスの URL を取得
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region asia-northeast1 \
    --format="value(status.url)" \
    --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$CLOUD_RUN_URL" ]; then
    echo -e "${RED}エラー: Cloud Runサービス '$SERVICE_NAME' のURLが取得できませんでした${NC}"
    exit 1
fi

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}     suzumina.click ${ENV} 検証チェックリスト     ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "検証URL: ${GREEN}$CLOUD_RUN_URL${NC}"
echo -e "プロジェクトID: ${GREEN}$PROJECT_ID${NC}"
echo -e "デプロイ環境: ${GREEN}$DEPLOY_ENV${NC}"
echo -e "Cloud Runサービス: ${GREEN}$SERVICE_NAME${NC}\n"

# HTTP レスポンスの検証
echo -e "${YELLOW}基本動作確認:${NC}"

check_url() {
    local url=$1
    local expected_code=$2
    local path_description=$3
    
    echo -e "  - ${path_description} をチェック中... "
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$status_code" == "$expected_code" ]; then
        echo -e "    ${GREEN}✓ OK${NC} (ステータスコード: $status_code)"
    else
        echo -e "    ${RED}✗ エラー${NC} (ステータスコード: $status_code, 期待値: $expected_code)"
    fi
}

# 基本ルートとページのチェック
check_url "$CLOUD_RUN_URL" "200" "トップページ"
check_url "$CLOUD_RUN_URL/profile" "200" "プロフィールページ"
check_url "$CLOUD_RUN_URL/non-existent-page" "404" "存在しないページ (404確認)"

echo -e "\n${YELLOW}パフォーマンス確認:${NC}"

# 基本的なパフォーマンスチェック
echo -e "  - トップページの応答時間を計測中..."
curl_time=$(curl -s -w '\nTotal: %{time_total}s\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\n' -o /dev/null "$CLOUD_RUN_URL")
echo -e "$curl_time"

# Firestoreコレクションの存在確認
echo -e "\n${YELLOW}Firestoreデータの確認:${NC}"
echo -e "  - YouTube動画コレクションをチェック中..."

video_count=$(gcloud firestore documents list \
    --collection="youtube-videos" \
    --project=$PROJECT_ID \
    --limit=10 \
    --format="value(name)" 2>/dev/null | wc -l)

if [ $? -eq 0 ] && [ $video_count -gt 0 ]; then
    echo -e "    ${GREEN}✓ OK${NC} (YouTube動画データが存在します。ドキュメント数: $video_count)"
else
    echo -e "    ${RED}✗ エラー${NC} (YouTube動画データにアクセスできないか、データがありません)"
fi

# Cloud Run サービスの設定確認
echo -e "\n${YELLOW}Cloud Run設定の確認:${NC}"
echo -e "  - メモリと CPU 設定をチェック中..."

memory=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region asia-northeast1 \
    --format="value(spec.template.spec.containers[0].resources.limits.memory)" \
    --project=$PROJECT_ID 2>/dev/null)

cpu=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region asia-northeast1 \
    --format="value(spec.template.spec.containers[0].resources.limits.cpu)" \
    --project=$PROJECT_ID 2>/dev/null)

if [ ! -z "$memory" ] && [ ! -z "$cpu" ]; then
    echo -e "    ${GREEN}✓ OK${NC} (メモリ: $memory, CPU: $cpu)"
else
    echo -e "    ${RED}✗ エラー${NC} (リソース設定を取得できません)"
fi

# 手動確認項目の表示
echo -e "\n${YELLOW}手動確認項目:${NC}"
echo -e "  1. ブラウザで ${GREEN}$CLOUD_RUN_URL${NC} を開き、動作を確認してください。"
echo -e "  2. Discord認証が正常に機能するか確認してください。"
echo -e "  3. プロフィールページが認証なしでアクセスできないことを確認してください。"
echo -e "  4. サイトのレスポンシブデザインをモバイルとデスクトップで確認してください。"
echo -e "  5. 日本語の表示が正しいことを確認してください。\n"

if [ "$ENV" == "本番環境" ]; then
    echo -e "${YELLOW}本番環境特有の確認項目:${NC}"
    echo -e "  1. DNSが正しく設定されているか確認してください（suzumina.click -> Cloud Run）。"
    echo -e "  2. SSL証明書が正しく設定されているか確認してください（https通信）。"
    echo -e "  3. Firebase Hostingから移行されたすべてのルートが正常に動作するか確認してください。\n"
fi

echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}検証チェックリストの実行が完了しました！${NC}"
echo -e "${BLUE}=================================================${NC}\n"

echo -e "すべての項目が正常であることを確認した場合、次のステップに進むことができます："
if [ "$ENV" == "評価環境" ]; then
    echo -e "  - 本番環境へのデプロイを開始: ${GREEN}./scripts/deploy-production.sh${NC}"
else
    echo -e "  - 旧Firebase Hosting設定のクリーンアップを実行: ${GREEN}./scripts/cleanup-firebase-hosting.sh${NC}"
fi