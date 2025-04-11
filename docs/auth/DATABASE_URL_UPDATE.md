# データベース接続URL更新手順

## 概要

データベース接続URLをSecret Managerで管理するための手順です。

## 前提条件

1. Secret Manager APIが有効化されていること
2. `database-url-dev`シークレットが作成済みであること
3. Cloud SQLインスタンスが作成済みであること

## 手順

### 1. シークレットの作成（初回のみ）

```bash
# シークレットの作成
gcloud secrets create database-url-dev \
  --project=suzumina-click-dev \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"
```

### 2. 接続URLの更新

```bash
# スクリプトを実行可能に
chmod +x iac/environments/dev/db_url_update.sh

# スクリプトの実行
./iac/environments/dev/db_url_update.sh \
  suzumina-click-dev \
  suzumina_app \
  your-db-password \
  suzumina-db-instance-dev \
  suzumina_db
```

## 確認方法

```bash
# 最新バージョンの確認
gcloud secrets versions list database-url-dev \
  --project=suzumina-click-dev

# シークレットの中身を確認
gcloud secrets versions access latest \
  --secret=database-url-dev \
  --project=suzumina-click-dev
```

## 注意事項

- データベースパスワードは安全に管理してください
- スクリプトを実行する際は、パスワードが履歴に残らないように注意してください
- シークレットの値は必要な場合のみ表示してください

## 関連ドキュメント

- [環境定義](../ENVIRONMENTS.md)
- [PostgreSQLデプロイ手順](./POSTGRESQL_DEPLOYMENT_PROCEDURE.md)
- [Cloud SQLドキュメント](https://cloud.google.com/sql/docs)
