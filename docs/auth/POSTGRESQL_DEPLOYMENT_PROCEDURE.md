# PostgreSQLデプロイ手順

## 概要

この文書では、PostgreSQL 17環境のデプロイ手順について詳細を記述します。ローカル開発環境から本番環境まで、一貫したPostgreSQL環境を提供するための手順を説明します。

## 前提条件

- Terraformがインストールされていること
- Google Cloud SDKがインストールされていること
- 必要な権限が設定されていること
- [環境定義](../ENVIRONMENTS.md)を理解していること
- [PostgreSQL開発環境](./POSTGRESQL_DEVELOPMENT_SETUP.md)がセットアップされていること

## デプロイ手順

### 1. GCP開発環境（suzumina-click-dev）へのデプロイ

#### 1.1. インフラストラクチャのセットアップ

```bash
# 開発環境用のディレクトリに移動
cd iac/environments/dev

# Terraformの初期化
terraform init

# 実行計画の確認
terraform plan -var="db_password=安全なパスワード"

# インフラストラクチャのデプロイ
terraform apply -var="db_password=安全なパスワード"

# 出力の確認
terraform output
```

#### 1.2. データベースURLの更新

```bash
# データベースURLの更新スクリプトを実行
./db_url_update.sh \
  suzumina-click-dev \
  suzumina_app \
  your-db-password \
  suzumina-db-instance-dev \
  suzumina_db
```

#### 1.3. マイグレーションの実行

```bash
cd apps/web

# マイグレーションの実行
bun run db:migrate
```

#### 1.4. 動作確認

```bash
# データベース接続の確認
gcloud sql connect suzumina-db-instance-dev --user=suzumina_app

# テーブルの確認
\dt

# Cloud Run サービスの確認
gcloud run services describe web
```

### 2. モニタリングの設定

```bash
# モニタリングダッシュボードの作成
gcloud monitoring dashboards create --config-from-file=monitoring/postgresql_dashboard.json
```

モニタリング対象：

1. **データベース接続数**
   - メトリクス: `cloudsql.googleapis.com/database/network/connections`

2. **クエリパフォーマンス**
   - メトリクス: `cloudsql.googleapis.com/database/postgresql/query_duration`

3. **エラー率**
   - ログクエリ: `resource.type=cloud_run_revision AND severity>=ERROR`

4. **ディスク使用量**
   - メトリクス: `cloudsql.googleapis.com/database/disk/bytes_used`

5. **CPU/メモリ使用率**
   - メトリクス: `cloudsql.googleapis.com/database/cpu/utilization`
   - メトリクス: `cloudsql.googleapis.com/database/memory/utilization`

### 3. 本番環境（suzumina-click）へのデプロイ

#### 3.1. 本番環境用のインフラストラクチャのセットアップ

```bash
cd iac/environments/prod

terraform init
terraform plan -var="db_password=安全なパスワード"
terraform apply -var="db_password=安全なパスワード"
```

#### 3.2. 本番環境でのマイグレーション実行

```bash
cd apps/web
bun run db:migrate
```

## ロールバック計画

問題が発生した場合は、以下の手順でロールバックします：

### 1. 即時ロールバック

```bash
# 前のバージョンのCloud Runサービスにロールバック
gcloud run services rollback web --to-revision=前のリビジョン
```

### 2. データベースのロールバック

```bash
# Point-in-Time Recoveryを使用してデータベースを復元
gcloud sql instances clone suzumina-db-instance \
  --source-instance=suzumina-db-instance \
  --point-in-time="移行前の時刻"
```

## パフォーマンス設定

両環境で同じパフォーマンス設定を使用：

```sql
-- 基本設定
SET max_connections = 100;
SET shared_buffers = '128MB';
SET effective_cache_size = '512MB';
SET work_mem = '4MB';
SET maintenance_work_mem = '64MB';
```

## 運用管理

### 1. 定期的なバックアップの確認

```bash
# バックアップの一覧を確認
gcloud sql backups list --instance=suzumina-db-instance
```

### 2. パフォーマンスの監視

- Cloud Monitoringダッシュボードで定期的にメトリクスを確認
- スロークエリの検出と最適化

### 3. セキュリティ対策

- 定期的なセキュリティ監査
- アクセス権限の見直し
- セキュリティアップデートの適用

## トラブルシューティング

### データベース接続エラー

1. VPCネットワークの設定を確認
2. ファイアウォールルールを確認
3. 接続情報（ホスト、ポート、認証情報）を確認

### パフォーマンス問題

1. メトリクスを確認して原因を特定
2. インデックスの最適化を検討
3. コネクションプールの設定を調整

### セキュリティ問題

1. アクセスログを確認
2. 権限設定を見直し
3. SSL/TLS設定を確認

## 注意事項

- 本番環境の変更は慎重に行う
- バックアップを定期的に確認する
- モニタリングアラートを適切に設定する
- セキュリティアップデートを迅速に適用する

## 参考資料

- [PostgreSQL開発環境セットアップ](./POSTGRESQL_DEVELOPMENT_SETUP.md)
- [データベースURL更新手順](./DATABASE_URL_UPDATE.md)
- [Google Cloud SQLドキュメント](https://cloud.google.com/sql/docs)
- [PostgreSQL 17ドキュメント](https://www.postgresql.org/docs/17/)
