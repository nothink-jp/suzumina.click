# すずみなふぁみりー

すずみなふぁみりーのコミュニティサイトです。

## 機能

- Discord OAuth2認証
  - サーバーメンバー限定のアクセス制御
  - セッション管理
  - ユーザープロフィール

## 開発環境のセットアップ

### 必要な環境

- Node.js 18.0.0以上
- Bun 1.0.0以上
- Discord Developer Portal へのアクセス権限

### インストール

```bash
# リポジトリのクローン
git clone git@github.com:nothink-jp/suzumina.click.git
cd suzumina.click

# 依存関係のインストール
bun install
```

### 環境変数の設定

`.env.local`を作成し、以下の環境変数を設定:

```env
# 認証設定
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generated-secret>"

# Discord OAuth2設定
DISCORD_CLIENT_ID="<client-id>"
DISCORD_CLIENT_SECRET="<client-secret>"
DISCORD_GUILD_ID="<guild-id>"

# GCP設定
GOOGLE_CLOUD_PROJECT="<project-id>"
GOOGLE_APPLICATION_CREDENTIALS="<path-to-credentials>"
```

詳細な設定手順は[認証システムのセットアップガイド](./auth/DEVELOPMENT_SETUP.md)を参照してください。

### 開発サーバーの起動

```bash
bun dev
```

<http://localhost:3000> でアプリケーションにアクセスできます。

## ディレクトリ構造

```
apps/web/
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # 共有コンポーネント
│   └── auth.ts       # 認証設定
├── docs/            # ドキュメント
└── iac/            # インフラストラクチャコード
```

## ドキュメント

- [認証システムの設計](./auth/AUTH_DESIGN.md)
- [開発環境のセットアップ](./auth/DEVELOPMENT_SETUP.md)
- [変更履歴](./CHANGELOG.md)
- [GCPインフラストラクチャ](./gcp/GCP_OVERVIEW.md)

## ライセンス

MIT License
