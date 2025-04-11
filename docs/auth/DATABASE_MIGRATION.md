# データベース移行に関する通知

## 概要

PostgreSQL環境を以下のように更新しました：

1. PostgreSQLバージョンを17に更新
2. 開発環境とプロダクション環境で同じバージョンを使用
3. パフォーマンス設定の最適化

## 主な変更点

### 開発環境

- Docker ComposeでPostgreSQL 17を使用
- ローカル開発環境のセットアップ手順を追加
- データベース接続設定の標準化

### プロダクション環境

- Cloud SQLインスタンスをPostgreSQL 17に更新
- 以下のパフォーマンス設定を追加:
  - max_connections: 100
  - shared_buffers: 128MB
  - effective_cache_size: 512MB
  - work_mem: 4MB
  - maintenance_work_mem: 64MB

## 開発者への注意事項

1. ローカル環境の更新
   - 既存のPostgreSQLコンテナを停止：`docker compose down`
   - 新しい環境の起動：`docker compose up -d`
   - マイグレーションの実行：`bun run db:migrate`

2. 開発環境の確認事項
   - 認証機能の動作確認
   - データベース接続の確認
   - マイグレーションの実行確認

3. トラブルシューティング
   - データベース接続エラーが発生した場合は[POSTGRESQL_DEVELOPMENT_SETUP.md](./POSTGRESQL_DEVELOPMENT_SETUP.md)を参照
   - 必要に応じてデータベースをリセット：`docker compose down -v`

## バックアップと復元

- プロダクション環境：Cloud SQLの自動バックアップを利用
- 開発環境：必要に応じてデータをエクスポート/インポート

## 今後の予定

1. パフォーマンスモニタリングの強化
2. 必要に応じてパフォーマンス設定の調整
3. セキュリティアップデートの定期的な適用

## 関連ドキュメント

- [PostgreSQL開発環境セットアップ](./POSTGRESQL_DEVELOPMENT_SETUP.md)
- [データベースURL更新手順](./DATABASE_URL_UPDATE.md)
- [PostgreSQLデプロイ手順](./POSTGRESQL_DEPLOYMENT_PROCEDURE.md)
