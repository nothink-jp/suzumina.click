#!/bin/bash
# パフォーマンステストの実行スクリプト

# 環境変数の設定
export NODE_ENV=production
export PG_LOCAL_TEST=false

# データベースURLの設定（実際の値は環境変数から取得）
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL環境変数が設定されていません"
  exit 1
fi

echo "パフォーマンステストを開始します..."

# テスト前の状態を記録
echo "テスト前のシステム状態:"
date
free -h
df -h

# パフォーマンステストの実行
bun run scripts/performance-test.ts

# 結果の確認
if [ $? -eq 0 ]; then
  echo "パフォーマンステストが正常に完了しました"
else
  echo "パフォーマンステストに失敗しました"
  exit 1
fi

# テスト後の状態を記録
echo "テスト後のシステム状態:"
date
free -h
df -h

echo "パフォーマンステストが完了しました"