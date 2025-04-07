# すずみなふぁみりー

すずみなふぁみりーのコミュニティサイトです。

## 機能

- Discord OAuth2認証
  - サーバーメンバー限定のアクセス制御
  - セッション管理
  - ユーザープロフィール
- Cloud Firestoreによるデータ永続化
- Cloud Runによるサーバーレスデプロイ

## 開発環境のセットアップ

### 必要な環境

- Node.js 18.0.0以上
- Bun 1.0.0以上
- Discord Developer Portal へのアクセス権限
- GCPプロジェクトへのアクセス権限

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

## プロジェクト構造

```
/
├── apps/                    # アプリケーション
│   └── web/                # Webアプリケーション
│       ├── src/
│       │   ├── app/        # Next.js App Router
│       │   │   ├── api/    # APIルート
│       │   │   ├── auth/   # 認証関連ページ
│       │   │   └── users/  # ユーザー関連ページ
│       │   ├── components/ # 共有コンポーネント (shadcn/uiベース, Storybookで管理)
│       │   └── auth.ts     # 認証設定
│       └── public/         # 静的ファイル
├── docs/                   # ドキュメント
│   ├── auth/              # 認証関連ドキュメント
│   └── gcp/               # GCP関連ドキュメント
├── iac/                   # インフラストラクチャコード
│   └── environments/      # 環境別設定
└── packages/              # 共有パッケージ（計画中）
```

## デプロイ

アプリケーションはGoogle Cloud PlatformのCloud Runにデプロイされます。
デプロイは GitHub Actions を通じて自動化される予定です。

デプロイ環境:

- 開発環境: `suzumina-click-dev`
- 本番環境: `suzumina-click-prod`（計画中）

詳細は[GCPインフラストラクチャ概要](./gcp/GCP_OVERVIEW.md)を参照してください。

## ドキュメント

- [認証システムの設計](./auth/AUTH_DESIGN.md)
- [開発環境のセットアップ](./auth/DEVELOPMENT_SETUP.md)
- [変更履歴](./CHANGELOG.md)
- [GCPインフラストラクチャ](./gcp/GCP_OVERVIEW.md)
- [プロジェクト分析](./PROJECT_ANALYSIS.md)

## 涼花みなせ プロフィール

### YouTube

- チャンネル名: 涼花みなせ / Suzuka Minase
- チャンネルID: `UChiMMOhl6FpzjoRqvZ5rcaA`

### SNS

X（旧Twitter）アカウント: [@suzuka_minase](https://x.com/suzuka_minase)

### コミュニティ

#### Discord

- サーバー名: すずみなふぁみりー
- サーバーID(ギルドID): `959095494456537158`

#### ci-en

- URL: [https://ci-en.dlsite.com/creator/9805](https://ci-en.dlsite.com/creator/9805)

## ライセンス

MIT License

最終更新日: 2025年4月7日
