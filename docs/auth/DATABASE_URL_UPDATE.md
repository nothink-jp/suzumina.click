# データベース接続URL更新手順

## 概要

PostgreSQL接続URLをSecret Managerで管理するための手順です。開発環境と本番環境のデータベース接続情報を安全に管理します。

## 前提条件

1. Secret Manager APIが有効化されていること
2. Cloud SQLインスタンス（PostgreSQL 17）が作成済みであること
3. 必要な権限が設定されていること

## 環境別の設定

### 1. ローカル開発環境

開発用データベース（.env.local）:

```bash
DATABASE_URL="postgres://suzumina_app:devpassword@localhost:5432/suzumina_db"
```

テスト用データベース（.env.test）:

```bash
DATABASE_URL="postgres://suzumina_app:devpassword@localhost:5432/suzumina_test_db"
```

### 2. GCP環境

#### シークレットの作成（初回のみ）

```bash
# 開発環境用シークレット
gcloud secrets create database-url-dev \
  --project=suzumina-click-dev \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"

# テスト環境用シークレット
gcloud secrets create database-url-test-dev \
  --project=suzumina-click-dev \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"
```

#### 開発環境の接続URLを更新

```bash
# スクリプトを実行可能に
chmod +x iac/environments/dev/db_url_update.sh

# 開発用データベースの更新
./iac/environments/dev/db_url_update.sh \
  suzumina-click-dev \
  suzumina_app \
  your-db-password \
  suzumina-db-instance-dev \
  suzumina_db

# テスト用データベースの更新
./iac/environments/dev/db_url_update.sh \
  suzumina-click-dev \
  suzumina_app \
  your-db-password \
  suzumina-db-instance-dev \
  suzumina_test_db \
  database-url-test-dev
```

## 接続の確認

### ローカル環境

```bash
# 開発用データベースの確認
docker compose exec db psql -U suzumina_app -d suzumina_db

# テスト用データベースの確認
docker compose exec db psql -U suzumina_app -d suzumina_test_db
```

### GCP環境

```bash
# シークレットの一覧確認
gcloud secrets list --project=suzumina-click-dev

# 開発用データベースURLの確認
gcloud secrets versions access latest \
  --secret=database-url-dev \
  --project=suzumina-click-dev

# テスト用データベースURLの確認
gcloud secrets versions access latest \
  --secret=database-url-test-dev \
  --project=suzumina-click-dev
```

## トラブルシューティング

### SSL接続の問題

1. ローカル開発環境
   - SSL無効化が正しく設定されているか確認
   - `docker-compose.yml`の設定を確認

2. GCP環境
   - SSL証明書が有効か確認
   - VPCネットワークの設定を確認

### 接続エラー

1. ネットワーク接続の確認

   ```bash
   # Cloud SQLインスタンスの状態確認
   gcloud sql instances describe suzumina-db-instance-dev
   ```

2. 認証情報の確認

   ```bash
   # データベースユーザーの一覧
   gcloud sql users list --instance=suzumina-db-instance-dev
   ```

## セキュリティ上の注意点

- パスワードを環境変数やコマンドライン引数で扱う際は注意
- シークレットの値は必要な場合のみ表示
- 定期的にパスワードを更新
- アクセス権限を定期的に監査

## 関連ドキュメント

- [PostgreSQL開発環境セットアップ](./POSTGRESQL_DEVELOPMENT_SETUP.md)
- [PostgreSQLデプロイ手順](./POSTGRESQL_DEPLOYMENT_PROCEDURE.md)
- [Cloud Secret Managerドキュメント](https://cloud.google.com/secret-manager/docs)
- [Cloud SQLドキュメント](https://cloud.google.com/sql/docs)
