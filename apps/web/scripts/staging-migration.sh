#!/bin/bash
# ステージング環境でのマイグレーション実行スクリプト

# 環境変数の設定
export NODE_ENV=production
export PG_LOCAL_TEST=false

# データベースURLの設定（実際の値は環境変数から取得）
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL環境変数が設定されていません"
  exit 1
fi

echo "ステージング環境でのマイグレーションを開始します..."

# マイグレーションの実行
bun run db:migrate

# 結果の確認
if [ $? -eq 0 ]; then
  echo "マイグレーションが正常に完了しました"
else
  echo "マイグレーションに失敗しました"
  exit 1
fi

echo "ステージング環境のセットアップが完了しました"