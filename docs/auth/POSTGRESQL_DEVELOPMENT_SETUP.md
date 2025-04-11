# PostgreSQLローカル開発環境セットアップ

## 概要

このプロジェクトではPostgreSQL 17を使用しています。開発環境とプロダクション環境で同じバージョンを使用することで、環境の一貫性を保ちます。

## 前提条件

- Docker Desktop のインストール
- Docker Compose のインストール
- bun のインストール

## 開発環境のセットアップ

1. プロジェクトのルートディレクトリに移動:

```bash
cd apps/web
```

2. docker-compose.ymlの作成:

```yaml
version: '3.8'
services:
  db:
    image: postgres:17
    restart: always
    environment:
      POSTGRES_USER: suzumina_app
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: suzumina_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U suzumina_app -d suzumina_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

3. 開発用の環境変数を設定:

```bash
echo 'DATABASE_URL="postgres://suzumina_app:devpassword@localhost:5432/suzumina_db"' > .env.development
```

4. PostgreSQLコンテナの起動:

```bash
docker compose up -d
```

5. マイグレーションの実行:

```bash
bun run db:migrate
```

## 開発フロー

1. サーバーの起動:

```bash
bun run dev
```

2. データベースの確認:

```bash
docker compose exec db psql -U suzumina_app -d suzumina_db
```

## トラブルシューティング

### ポート5432が既に使用されている場合

```bash
# 既存のPostgreSQLプロセスを確認
sudo lsof -i :5432

# 必要に応じてポートを変更
# docker-compose.ymlの ports を "5433:5432" に変更
```

### マイグレーションエラーが発生した場合

```bash
# データベースのリセット
docker compose down -v
docker compose up -d
bun run db:migrate
```

## 本番環境との違い

1. SSL設定
   - 開発環境: SSL無効
   - 本番環境: SSL有効

2. 接続方法
   - 開発環境: 直接接続
   - 本番環境: VPCコネクタ経由

3. バックアップ設定
   - 開発環境: なし
   - 本番環境: 自動バックアップ有効

## 補足

- PostgreSQL 17を選択した理由:
  - 最新の機能とセキュリティ更新の利用
  - パフォーマンスの改善
  - 開発環境と本番環境の一貫性確保

- データベースツール:
  - [pgAdmin 4](https://www.pgadmin.org/)
  - [DBeaver Community](https://dbeaver.io/)
