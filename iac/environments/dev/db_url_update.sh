#!/bin/bash

# データベース接続URLを更新するスクリプト
# 使用例: ./db_url_update.sh suzumina-click-dev suzumina_app パスワード suzumina-db-instance-dev suzumina_db

PROJECT_ID=$1
DB_USER=$2
DB_PASSWORD=$3
DB_INSTANCE=$4
DB_NAME=$5

# プライベートIPアドレスの取得
PRIVATE_IP=$(gcloud sql instances describe $DB_INSTANCE \
  --project=$PROJECT_ID \
  --format='get(ipAddresses[0].ipAddress)')

# データベース接続URLの生成
DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${PRIVATE_IP}:5432/${DB_NAME}"

# Secret Managerの更新
echo "${DB_URL}" | gcloud secrets versions add database-url-dev \
  --project=$PROJECT_ID \
  --data-file=-