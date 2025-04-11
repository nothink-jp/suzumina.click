#!/bin/bash
# すべてのテストを一括で実行するマスタースクリプト

# 環境変数の設定
export NODE_ENV=production
export PG_LOCAL_TEST=false

# データベースURLの設定（実際の値は環境変数から取得）
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL環境変数が設定されていません"
  exit 1
fi

echo "===== PostgreSQL移行テスト開始 ====="
echo "実行日時: $(date)"
echo "データベースURL: $DATABASE_URL"
echo "環境: $NODE_ENV"

# 実行権限の付与
chmod +x scripts/staging-migration.sh
chmod +x scripts/test-auth-flow.sh
chmod +x scripts/run-performance-test.sh
chmod +x scripts/run-security-test.sh

# 1. マイグレーションの実行
echo -e "\n\n===== 1. マイグレーションの実行 ====="
./scripts/staging-migration.sh

# マイグレーションが失敗した場合は終了
if [ $? -ne 0 ]; then
  echo "マイグレーションに失敗しました。テストを中止します。"
  exit 1
fi

# 2. 認証フローのテスト
echo -e "\n\n===== 2. 認証フローのテスト ====="
./scripts/test-auth-flow.sh

# 認証フローテストが失敗した場合は終了
if [ $? -ne 0 ]; then
  echo "認証フローテストに失敗しました。テストを中止します。"
  exit 1
fi

# 3. パフォーマンステスト
echo -e "\n\n===== 3. パフォーマンステスト ====="
./scripts/run-performance-test.sh

# パフォーマンステストが失敗した場合も続行
if [ $? -ne 0 ]; then
  echo "パフォーマンステストに失敗しましたが、続行します。"
fi

# 4. セキュリティテスト
echo -e "\n\n===== 4. セキュリティテスト ====="
./scripts/run-security-test.sh

# セキュリティテストが失敗した場合も続行
if [ $? -ne 0 ]; then
  echo "セキュリティテストに失敗しましたが、続行します。"
fi

# テスト結果のサマリー
echo -e "\n\n===== テスト結果のサマリー ====="
echo "実行日時: $(date)"
echo "すべてのテストが完了しました。"
echo "テスト結果を確認し、問題がなければ本番環境へのデプロイを検討してください。"