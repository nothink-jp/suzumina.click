#!/bin/bash
# セキュリティテストの実行スクリプト

# 環境変数の設定
export NODE_ENV=production
export PG_LOCAL_TEST=false

# データベースURLの設定（実際の値は環境変数から取得）
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL環境変数が設定されていません"
  exit 1
fi

echo "セキュリティテストを開始します..."

# セキュリティテストの実行
bun run scripts/security-test.ts

# 結果の確認
if [ $? -eq 0 ]; then
  echo "セキュリティテストが正常に完了しました"
else
  echo "セキュリティテストに失敗しました"
  exit 1
fi

echo "セキュリティテストが完了しました"

# PostgreSQL固有のセキュリティチェック
if [[ $DATABASE_URL == postgres://* ]]; then
  echo "PostgreSQL固有のセキュリティチェックを実行します..."
  
  # SSL接続の確認
  echo "SSL接続の確認:"
  if [[ $DATABASE_URL == *"ssl=true"* ]]; then
    echo "✅ SSL接続が有効になっています"
  else
    echo "⚠️ SSL接続が明示的に設定されていません。本番環境ではSSL接続を有効にすることを推奨します"
  fi
  
  # プライベートネットワーク接続の確認
  echo "プライベートネットワーク接続の確認:"
  echo "⚠️ Cloud SQLインスタンスがプライベートIPアドレスを使用していることを確認してください"
  echo "⚠️ パブリックIPアドレスを使用している場合は、適切なファイアウォールルールが設定されていることを確認してください"
  
  # バックアップ設定の確認
  echo "バックアップ設定の確認:"
  echo "⚠️ Cloud SQLインスタンスで自動バックアップが有効になっていることを確認してください"
  echo "⚠️ ポイントインタイムリカバリが有効になっていることを確認してください"
fi

echo "すべてのセキュリティチェックが完了しました"