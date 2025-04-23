# 開発環境セットアップガイド

このガイドでは、suzumina.clickプロジェクトのモノレポ構成における開発環境のセットアップ方法を説明します。

## 前提条件

以下のツールがインストールされていることを確認してください：

- Node.js (v22以上)
- pnpm (v8以上)
- Docker (コンテナテスト用)
- Google Cloud SDK (オプション、テストデプロイ用)

## 1. リポジトリのクローンと初期セットアップ

### 1.1 リポジトリのクローン

```bash
git clone https://github.com/nothink-jp/suzumina.click.git
cd suzumina.click
```

### 1.2 依存関係のインストール

モノレポ構成のため、ルートディレクトリから依存関係をインストールします。

```bash
pnpm install
```

### 1.3 環境変数の設定

モノレポ構成のため、各アプリケーションディレクトリに環境変数ファイルを作成します：

#### Webアプリケーション用環境変数

`apps/web/.env.local` ファイルを作成します：

```bash
# apps/web/.env.local の例
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=suzumina-click-firebase
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
```

#### Cloud Functions用環境変数（ローカルテスト時）

`apps/functions/.env.local` ファイルを作成します（ローカルでの関数テスト用）：

```bash
# apps/functions/.env.local の例
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_TARGET_GUILD_ID=959095494456537158
YOUTUBE_API_KEY=your_youtube_api_key_here
```

必要な環境変数の詳細については、[環境変数ガイド](./ENVIRONMENT_VARIABLES.md)を参照してください。

## 2. 開発サーバーの起動

### 2.1 Webアプリケーションの開発サーバー

Next.jsの開発サーバーをTurbopackモードで起動します：

```bash
# ルートディレクトリから実行
pnpm dev

# または特定のワークスペース指定で実行
pnpm --filter @suzumina.click/web dev
```

サーバーが起動したら、ブラウザで http://localhost:3000 にアクセスできます。

### 2.2 Storybookの起動

UIコンポーネントのビジュアル開発とドキュメント化にStorybookを使用できます：

```bash
# ルートディレクトリから実行
pnpm storybook

# または特定のワークスペース指定で実行
pnpm --filter @suzumina.click/web storybook
```

Storybookは http://localhost:6006 で起動します。

## 3. テストとコード品質

### 3.1 テストの実行

Vitestを使用してテストを実行します：

```bash
# すべてのプロジェクトのテストを実行
pnpm test

# 特定のワークスペースのテストのみ実行
pnpm --filter @suzumina.click/web test

# 監視モードでテストを実行
pnpm test:watch
```

### 3.2 リントとフォーマット

Biomeを使用してコードのリントとフォーマットを実行します：

```bash
# リント実行
pnpm lint

# フォーマット実行
pnpm format

# リントとフォーマットチェックのみを実行
pnpm check
```

## 4. モノレポでの開発

### 4.1 ワークスペース構造

プロジェクトは以下のワークスペース構造になっています：

- `apps/web`: Next.jsフロントエンドアプリケーション
- `apps/functions`: Firebase Cloud Functions（認証機能のみ）
- `packages`: 共有パッケージ（今後の拡張用）

### 4.2 ワークスペース操作

特定のワークスペースでコマンドを実行する場合：

```bash
# Webアプリケーションのビルド
pnpm --filter @suzumina.click/web build

# Cloud Functionsのビルド
pnpm --filter @suzumina.click/functions build
```

### 4.3 依存関係の管理

ワークスペースに新しい依存関係を追加する場合：

```bash
# Webアプリケーションに依存関係を追加
pnpm --filter @suzumina.click/web add パッケージ名

# 開発依存関係として追加
pnpm --filter @suzumina.click/web add -D パッケージ名
```

## 5. ローカルでのコンテナテスト

Next.jsアプリをコンテナでローカルテストする場合：

```bash
# アプリケーションのビルド
pnpm --filter @suzumina.click/web build

# Dockerイメージのビルド
cd apps/web
docker build -t suzumina-click-nextjs-app:local .

# コンテナの実行
docker run -p 8080:8080 suzumina-click-nextjs-app:local
```

ブラウザで http://localhost:8080 にアクセスしてアプリケーションを確認できます。

## 6. トラブルシューティング

### 6.1 依存関係の問題

依存関係に問題がある場合：

```bash
# pnpmキャッシュをクリア
pnpm store prune

# 依存関係の再インストール
pnpm install --force
```

### 6.2 モノレポ関連の問題

ワークスペース関連の問題がある場合：

```bash
# ビルドキャッシュをクリーン
pnpm clean

# 依存関係の再インストール
pnpm install
```

### 6.3 Next.jsのキャッシュ問題

Next.jsのビルドキャッシュに問題がある場合：

```bash
# .nextディレクトリを削除
rm -rf apps/web/.next

# 再ビルド
pnpm --filter @suzumina.click/web build
```

## 7. デプロイ

デプロイ関連の詳細な手順は、[デプロイ手順マニュアル](./DEPLOYMENT.md)を参照してください。

現在はステージング環境のみに対してデプロイを行っており、以下の2つの方法があります：

1. **GitHub Actionsを使用したデプロイ** (推奨)
   - 特定の担当者のみが実行可能
   - リポジトリの「Actions」タブから「ステージング環境へのデプロイトリガー」ワークフローを実行

2. **スクリプトを使用した開発者テスト用デプロイ**
   - `scripts/deploy-test.sh` スクリプトを使用
   - GCP認証が必要

## 8. 今後の開発環境改善計画

プロジェクトでは以下の開発環境改善を検討しています：

- **Cloud Code (VS Code拡張) の導入**
  - ローカルでのGCPリソースエミュレーション
  - リモートデバッグ機能
  - クラウドデプロイ連携

- **モニタリング強化**
  - Cloud Runメトリクスの監視設定
  - アラートの構築

詳細についてはTODOリストを確認してください。