#!/bin/bash

# Firebase Hostingクリーンアップスクリプト
# 使用方法: ./scripts/cleanup-firebase-hosting.sh

# エラーが発生した場合に停止
set -e

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 確認メッセージを表示
echo -e "${YELLOW}警告: このスクリプトはFirebase Hostingの設定を削除し、Cloud Run環境への完全な移行を行います。${NC}"
echo -e "${YELLOW}既存のFirebase Hosting設定とGitHub Actions設定ファイルが削除されます。${NC}"
read -p "続行しますか？ (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}操作を中止します。${NC}"
    exit 1
fi

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}    Firebase Hosting → Cloud Run 移行クリーンアップ    ${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Firebase設定ファイルのバックアップ
echo -e "${YELLOW}1. firebase.jsonとhostingの設定をバックアップします...${NC}"
cp firebase.json firebase.json.bak
echo -e "  ${GREEN}✓ バックアップ作成: firebase.json.bak${NC}"

# firebase.jsonからhosting設定を削除
echo -e "\n${YELLOW}2. firebase.jsonからhosting設定を削除します...${NC}"
cat firebase.json | jq 'del(.hosting)' > firebase.json.tmp
mv firebase.json.tmp firebase.json
echo -e "  ${GREEN}✓ hostingセクションを削除しました${NC}"

# GitHub ActionsのFirebase Hostingデプロイワークフローファイルを削除
echo -e "\n${YELLOW}3. GitHub ActionsのFirebase Hostingデプロイワークフローファイルを削除します...${NC}"
if [ -f .github/workflows/firebase-hosting-merge.yml ]; then
    rm .github/workflows/firebase-hosting-merge.yml
    echo -e "  ${GREEN}✓ firebase-hosting-merge.yml を削除しました${NC}"
else
    echo -e "  ${BLUE}ℹ firebase-hosting-merge.yml は既に存在しません${NC}"
fi

if [ -f .github/workflows/firebase-hosting-pull-request.yml ]; then
    rm .github/workflows/firebase-hosting-pull-request.yml
    echo -e "  ${GREEN}✓ firebase-hosting-pull-request.yml を削除しました${NC}"
else
    echo -e "  ${BLUE}ℹ firebase-hosting-pull-request.yml は既に存在しません${NC}"
fi

# 変更内容の確認
echo -e "\n${YELLOW}4. Firebase Hostingの無効化を試みます...${NC}"
echo -e "  この操作には認証が必要で、エラーが発生する場合があります。エラーは無視して構いません。"
firebase hosting:disable --non-interactive || true
echo -e "  ${BLUE}ℹ Firebase Hostingの無効化を試みました（エラーは無視してください）${NC}"

# Terrafromで管理されているCloudRun設定の最新化を確認
echo -e "\n${YELLOW}5. 最新のTerraform設定の適用を確認します...${NC}"
read -p "現在のディレクトリで'terraform apply'を実行しますか？ (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "  Terraformを適用します..."
    (cd terraform && terraform apply)
    echo -e "  ${GREEN}✓ Terraform設定を適用しました${NC}"
else
    echo -e "  ${BLUE}ℹ Terraformの適用をスキップしました${NC}"
fi

# DNS設定の確認
echo -e "\n${YELLOW}6. DNS設定を確認してください...${NC}"
echo -e "  Google Cloud Consoleで「Cloud Run」を開き、サービスの詳細を表示します。"
echo -e "  「ドメインのマッピング」タブで、DNSレコードが正しく構成されていることを確認してください。"
echo -e "  詳細手順は docs/DEPLOYMENT.md を参照してください。"

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${GREEN}Firebase HostingからCloud Runへの移行クリーンアップが完了しました！${NC}"
echo -e "${BLUE}=================================================${NC}\n"

echo -e "${YELLOW}以下の変更が適用されました：${NC}"
echo -e "  1. firebase.jsonからhosting設定が削除されました"
echo -e "  2. GitHub ActionsのFirebase Hostingデプロイワークフローが削除されました"
echo -e "  3. Firebase Hostingの無効化を試みました\n"

echo -e "${YELLOW}次のステップ:${NC}"
echo -e "  1. DNS設定が適切に構成されていることを確認します"
echo -e "  2. https://suzumina.click が正しくCloud Runを指していることを確認します"
echo -e "  3. 変更をコミットします:"
echo -e "     git add firebase.json .github/workflows/"
echo -e "     git commit -m \"chore: Firebase Hostingからの完全移行が完了\""
echo -e "  4. 新環境でのパフォーマンスを検証します: ./scripts/verify-deployment.sh 本番環境\n"

echo -e "${BLUE}※ 何か問題が発生した場合は、firebase.json.bakからファイルを復元できます。${NC}"