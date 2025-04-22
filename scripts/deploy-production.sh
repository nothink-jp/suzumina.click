#!/bin/bash

# 本番環境へのデプロイスクリプト
# 使用方法: ./scripts/deploy-production.sh

# エラーが発生した場合に停止
set -e

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 確認メッセージを表示
echo -e "${RED}警告: このスクリプトは本番環境へのデプロイを実行します。${NC}"
echo -e "${YELLOW}実行前に評価環境での動作確認が完了していることを確認してください。${NC}"
read -p "続行しますか？ (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}操作を中止します。${NC}"
    exit 1
fi

# ブランチ確認
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}現在のブランチは 'main' ではなく '$CURRENT_BRANCH' です。${NC}"
    read -p "それでも続行しますか？ (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo -e "${RED}操作を中止します。mainブランチにチェックアウトしてから再実行してください。${NC}"
        exit 1
    fi
fi

# 未コミットの変更が存在するか確認
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}未コミットの変更が存在します。${NC}"
    read -p "それでも続行しますか？ (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo -e "${RED}操作を中止します。変更をコミットしてから再実行してください。${NC}"
        exit 1
    fi
fi

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}            本番環境へのデプロイ開始             ${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# プロジェクトIDの設定
# 固定プロジェクトIDを使用（エラーメッセージに基づく）
PROJECT_ID="suzumina-click-firebase"
echo -e "${YELLOW}プロジェクトID: ${GREEN}$PROJECT_ID${NC}\n"

# トリガータイプの選択
echo -e "${YELLOW}デプロイ方法を選択してください:${NC}"
echo -e "  1) GitHub ActionsからCloud Buildトリガーを実行（推奨）"
echo -e "  2) ローカルからビルドとデプロイを実行"
read -p "選択 (1/2): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
    echo -e "\n${YELLOW}GitHub ActionsワークフローからCloud Buildトリガーを実行します...${NC}"
    echo -e "ブラウザで以下のURLを開いてください:"
    echo -e "${BLUE}https://github.com/nothink-jp/suzumina.click/actions/workflows/trigger-production-deploy.yml${NC}"
    echo -e "\n以下の操作を行ってください:"
    echo -e "1. 「Run workflow」ボタンをクリック"
    echo -e "2. ブランチ名を入力（通常は「main」）"
    echo -e "3. 「Run workflow」を実行"
    echo -e "\nワークフローの実行状況がブラウザに表示されます。"

elif [[ $REPLY =~ ^[2]$ ]]; then
    echo -e "\n${YELLOW}ローカルからビルドとデプロイを実行します...${NC}"
    
    echo -e "\n${BLUE}1. モノレポの依存関係をインストール中...${NC}"
    pnpm install --frozen-lockfile
    
    echo -e "\n${BLUE}2. アプリケーションをビルド中...${NC}"
    pnpm --filter @suzumina.click/web build
    
    echo -e "\n${BLUE}3. Dockerイメージをビルド中...${NC}"
    docker build -t gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:production -t gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:latest ./apps/web
    
    echo -e "\n${BLUE}4. イメージをContainer Registryにプッシュ中...${NC}"
    docker push gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:production
    docker push gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:latest
    
    echo -e "\n${BLUE}5. Cloud Runにデプロイ中...${NC}"
    gcloud run deploy suzumina-click-nextjs-app \
        --image gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:production \
        --region asia-northeast1 \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars="NEXT_PUBLIC_DEPLOY_ENV=production"

    echo -e "\n${GREEN}デプロイが完了しました！${NC}"
    
    # デプロイURLの取得と表示
    DEPLOY_URL=$(gcloud run services describe suzumina-click-nextjs-app \
        --platform managed \
        --region asia-northeast1 \
        --format="value(status.url)")
    
    echo -e "${GREEN}デプロイURL: $DEPLOY_URL${NC}"
else
    echo -e "${RED}無効な選択です。操作を中止します。${NC}"
    exit 1
fi

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${GREEN}本番環境へのデプロイプロセスが開始されました！${NC}"
echo -e "${BLUE}=================================================${NC}\n"

echo -e "${YELLOW}デプロイ後の確認:${NC}"
echo -e "1. 本番環境でアプリケーションが正常に動作することを確認してください。"
echo -e "2. 以下のコマンドで検証チェックリストを実行してください:"
echo -e "   ${GREEN}./scripts/verify-deployment.sh 本番環境${NC}"
echo -e "3. 問題がなければ、以下のコマンドでFirebase Hostingの設定をクリーンアップしてください:"
echo -e "   ${GREEN}./scripts/cleanup-firebase-hosting.sh${NC}\n"

echo -e "${BLUE}※ 何か問題が発生した場合は、GitHub Actionsのログを確認するか、"
echo -e "   Google Cloud ConsoleのCloud Run、Cloud Buildセクションを確認してください。${NC}"