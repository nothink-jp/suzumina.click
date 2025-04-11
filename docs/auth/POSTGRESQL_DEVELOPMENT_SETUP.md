# PostgreSQLローカル開発環境セットアップ

## 概要

このプロジェクトではPostgreSQL 17を使用しています。開発環境とプロダクション環境で同じバージョンを使用することで、環境の一貫性を保ちます。

## 前提条件

- Docker Desktop のインストール
- Docker Compose のインストール
- bun のインストール

## セキュリティに関する注意事項

### 環境変数の管理

1. `.env.example`をコピーして`.env.local`を作成

```bash
cp .env.example .env.local
```

2. 強力なパスワードの生成

```bash
# PostgreSQLパスワードの生成
openssl rand -base64 32

# NextAuthシークレットの生成
openssl rand -base64 32
```

3. 生成したパスワードを`.env.local`に設定

**重要**: コミットする際は`.env.local`や実際のパスワードを含まないように注意してください。

### 開発環境のセキュリティ

- デフォルトパスワードは使用しない
- 各開発者は独自の`.env.local`を管理
- 本番環境の認証情報は別途、安全に管理

## 開発環境のセットアップ

1. 環境変数の設定

```bash
# .env.exampleをコピーして.env.localを作成
cp .env.example .env.local

# 必要な環境変数を設定
vi .env.local
```

2. データベースコンテナの起動

```bash
docker compose up -d
```

3. マイグレーションの実行

```bash
bun run db:migrate
```

## データベースの接続確認

```bash
# PostgreSQLへの接続
docker compose exec db psql -U $POSTGRES_USER -d suzumina_db

# テーブル一覧の確認
\dt
```

## トラブルシューティング

### ポート5432が既に使用されている場合

```bash
# 既存のPostgreSQLプロセスを確認
sudo lsof -i :5432

# 必要に応じてポートを変更
# docker-compose.ymlの ports を "5433:5432" に変更
```

### 認証エラーが発生する場合

```bash
# 環境変数が正しく設定されているか確認
echo $POSTGRES_USER
echo $POSTGRES_PASSWORD

# データベースの認証設定を確認
docker compose exec db cat /var/lib/postgresql/data/pg_hba.conf
```

## 本番環境との違い

1. SSL設定
   - 開発環境: SSL無効
   - 本番環境: SSL有効（必須）

2. 認証設定
   - 開発環境: パスワード認証
   - 本番環境: IAM認証

3. ネットワーク
   - 開発環境: ローカルネットワーク
   - 本番環境: VPCネットワーク

## 関連ドキュメント

- [環境変数の設定](./DATABASE_URL_UPDATE.md)
- [PostgreSQLデプロイ手順](./POSTGRESQL_DEPLOYMENT_PROCEDURE.md)
- [PostgreSQLセキュリティガイドライン](https://www.postgresql.org/docs/17/auth-pg-hba-conf.html)
