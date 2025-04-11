# suzumina.click

## 概要

suzumina.click は Discord 認証を使用したウェブアプリケーションです。

## 開発環境のセットアップ

### 必要な環境

- Node.js v20以上
- Bun v1.0.0以上
- Visual Studio Code（推奨）
- Git

### セットアップ手順

1. リポジトリのクローン

```bash
git clone https://github.com/nothink-jp/suzumina.click.git
cd suzumina.click
```

2. 依存関係のインストール

```bash
bun install
```

3. 環境変数の設定

```bash
# .env.localファイルを作成
cp .env.example .env.local

# 必要な環境変数を設定
# - NEXTAUTH_URL: 認証コールバックURL
# - NEXTAUTH_SECRET: 認証用シークレット
# - DISCORD_CLIENT_ID: DiscordアプリのクライアントID
# - DISCORD_CLIENT_SECRET: Discordアプリのクライアントシークレット
# - DISCORD_GUILD_ID: Discordサーバー（ギルド）ID
```

4. 開発サーバーの起動

```bash
bun run dev
```

アプリケーションは <http://localhost:3000> で起動します。

## 環境構成

このプロジェクトは以下の3つの環境で構成されています：

1. **ローカル開発環境**
   - SQLiteデータベースを使用
   - `NODE_ENV=development`
   - ファイルベースの簡易な開発環境

2. **GCP開発環境** (suzumina-click-dev)
   - PostgreSQLデータベース（Cloud SQL）を使用
   - `NODE_ENV=production`
   - 開発版のデプロイとテスト用

3. **GCP本番環境** (suzumina-click)
   - PostgreSQLデータベース（Cloud SQL）を使用
   - `NODE_ENV=production`
   - 本番サービスの提供用

詳細は [環境定義](docs/ENVIRONMENTS.md) を参照してください。

## データベース操作

### マイグレーション

```bash
# マイグレーションの生成
bun run db:generate

# マイグレーションの実行（開発環境）
bun run db:migrate

# マイグレーションの実行（GCP環境）
DATABASE_URL=postgres://user:password@host:5432/database bun run db:migrate
```

### スキーマの更新

`apps/web/src/db/schema.ts` でデータベーススキーマを定義します。

## テスト

```bash
# 全テストの実行
bun test

# 特定のテストの実行
bun test src/auth.test.ts
```

## デプロイ

GCP環境へのデプロイ手順は [PostgreSQLデプロイ手順](docs/auth/POSTGRESQL_DEPLOYMENT_PROCEDURE.md) を参照してください。

## ドキュメント

- [環境定義](docs/ENVIRONMENTS.md) - 環境構成の詳細
- [アーキテクチャ設計](docs/ARCHITECTURE_DESIGN.md) - システム全体のアーキテクチャ
- [認証設計](docs/auth/AUTH_DESIGN.md) - 認証システムの設計
- [GCP概要](docs/gcp/GCP_OVERVIEW.md) - GCPリソースの概要

## ライセンス

AGPL-3.0 License

## コントリビューション

1. Issueを作成して変更内容を説明
2. フィーチャーブランチを作成
3. 変更をコミット
4. プルリクエストを作成
