#!/bin/bash
# 認証フローのテストスクリプト

# 環境変数の設定
export NODE_ENV=production
export PG_LOCAL_TEST=false

# データベースURLの設定（実際の値は環境変数から取得）
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL環境変数が設定されていません"
  exit 1
fi

echo "認証フローのテストを開始します..."

# テストの実行
echo "1. ユーザーセッションのテスト"
bun test src/auth.test.ts

# 結果の確認
if [ $? -eq 0 ]; then
  echo "ユーザーセッションのテストが正常に完了しました"
else
  echo "ユーザーセッションのテストに失敗しました"
  exit 1
fi

echo "2. ユーザー操作のテスト"
bun run scripts/test-user-operations.ts

# 結果の確認
if [ $? -eq 0 ]; then
  echo "ユーザー操作のテストが正常に完了しました"
else
  echo "ユーザー操作のテストに失敗しました"
  exit 1
fi

echo "認証フローのテストが完了しました"