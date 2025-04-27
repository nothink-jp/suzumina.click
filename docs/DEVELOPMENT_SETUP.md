# 開発環境セットアップガイド

このガイドでは、suzumina.clickプロジェクトのモノレポ構成における開発環境のセットアップ方法を説明します。

## 前提条件

以下のツールがインストールされていることを確認してください：

- Node.js (v22以上)
- pnpm (v8以上)
- Firebase CLI
- Docker (コンテナテスト用)
- Google Cloud SDK (オプション、テストデプロイ用)

### ツールのインストール手順

#### Node.jsとpnpmのインストール

macOSの場合:

```bash
# Homebrewを使用
brew install node
npm install -g pnpm@latest

# バージョン確認
node -v  # v22.x.x 以上であること
pnpm -v  # v8.x.x 以上であること
```

#### Firebase CLIのインストール

```bash
npm install -g firebase-tools

# インストール確認
firebase --version  # 12.x.x 以上であること
```

#### Docker Desktop

[Docker Desktop公式サイト](https://www.docker.com/products/docker-desktop/)からインストーラーをダウンロードしてインストールしてください。

#### Google Cloud SDK (オプション)

[Google Cloud SDK インストールガイド](https://cloud.google.com/sdk/docs/install)に従ってインストールしてください。

```bash
# インストール確認
gcloud --version
```

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

### 1.3 Firebase プロジェクトの設定（初回のみ）

Firebase CLIを使用してローカル環境を初期化します。エミュレータを使用するための基本設定です。

```bash
# Firebaseにログイン（初回のみ）
firebase login

# プロジェクトの選択
firebase use suzumina-click-firebase
```

### 1.4 環境変数の設定

モノレポ構成のため、各アプリケーションディレクトリに環境変数ファイルを作成します：

#### Webアプリケーション用環境変数

`apps/web/.env.local` ファイルを作成します：

```bash
# apps/web/.env.local の例
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=suzumina-click-firebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Discord認証関連
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_TARGET_GUILD_ID=your_guild_id

# エミュレータ使用設定（ローカル開発時）
NEXT_PUBLIC_USE_EMULATOR=true
```

#### Cloud Functions用環境変数

`apps/functions/.env.local` ファイルを作成します：

```bash
# apps/functions/.env.local の例
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_TARGET_GUILD_ID=959095494456537158
YOUTUBE_API_KEY=your_youtube_api_key_here

# エミュレータ使用設定
FUNCTIONS_EMULATOR=true
```

必要な環境変数の詳細については、[環境変数ガイド](./ENVIRONMENT_VARIABLES.md)を参照してください。

## 2. ローカル開発環境の準備

### 2.1 アプリケーションのビルド

各アプリケーションのソースコードをビルドします。

```bash
# すべてのアプリケーションをビルド
pnpm build

# または個別にビルド
# Webアプリケーション
pnpm --filter @suzumina.click/web build

# Cloud Functions
pnpm --filter @suzumina.click/functions build
```

### 2.2 Firebase Emulatorの起動

ローカルでFirebase Emulatorを起動して、Authentication、Firestore、Cloud Functionsをエミュレートします。

```bash
# プロジェクトルートから実行
pnpm emulator:start
```

または、VS Codeのタスクから実行することも可能です:

```
View -> Command Palette -> Tasks: Run Task -> Firebase Emulator 起動
```

エミュレータが起動すると、以下のURLでエミュレータUIにアクセスできます：

- **Emulator UI**: http://localhost:4000
- **Firebase Authentication**: http://localhost:9099
- **Firestore Database**: http://localhost:8080

### 2.3 Webアプリケーションの開発サーバー起動

Next.jsの開発サーバーをTurbopackモードで起動します：

```bash
# ルートディレクトリから実行
pnpm dev

# または特定のワークスペース指定で実行
pnpm --filter @suzumina.click/web dev
```

サーバーが起動したら、ブラウザで <http://localhost:3000> にアクセスできます。

### 2.4 テストデータの準備（オプション）

Firestoreエミュレータにテストデータを挿入するには、以下のコマンドを実行します：

```bash
# テストデータをインポートしてエミュレータを再起動
pnpm emulator:start-with-data
```

### 2.5 ローカル環境でのCloud Functionsテスト

Firebase Emulatorが起動している状態で、Cloud Functions のコードを変更した場合は以下の手順でテストできます:

```bash
# Cloud Functionsのビルド（コード変更時に実行）
pnpm --filter @suzumina.click/functions build

# エミュレータは変更を検知して自動的に関数を再デプロイします
```

## 3. テストとコード品質

### 3.1 テストの実行

Vitestを使用してテストを実行します：

```bash
# すべてのプロジェクトのテストを実行
pnpm test

# 特定のワークスペースのテストのみ実行
pnpm --filter @suzumina.click/web test
pnpm --filter @suzumina.click/functions test

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
- `apps/functions`: Firebase Cloud Functions
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

ブラウザで <http://localhost:8080> にアクセスしてアプリケーションを確認できます。

## 6. VS Code開発環境の最適化

### 6.1 推奨拡張機能

プロジェクトには以下の拡張機能をインストールすることをお勧めします：

1. **Biome** - コードフォーマッターとリンター
2. **ESLint** - JavaScript/TypeScriptのリンティング
3. **Cloud Code** - Google Cloud Platformとの連携
4. **Firebase Explorer** - Firebaseプロジェクト管理

VS Codeで `.vscode/extensions.json` に基づいて推奨拡張機能をインストールします。

### 6.2 Cloud Code拡張機能の利用

Cloud Code拡張機能をインストールすると、VS Code内で以下の機能を利用できます：

1. **Firebaseエミュレータ管理** - サイドバーの「Cloud Code」パネルから操作
2. **Firestore Explorer** - Firestoreデータベースの閲覧・編集
3. **Cloud Run実行構成** - ローカルでのデバッグ

詳細な利用方法については、[Cloud Code拡張ガイド](./CLOUD_CODE_INTEGRATION.md)を参照してください。

## 7. トラブルシューティング

### 7.1 依存関係の問題

依存関係に問題がある場合：

```bash
# pnpmキャッシュをクリア
pnpm store prune

# 依存関係の再インストール
pnpm install --force
```

### 7.2 エミュレータの問題

エミュレータが正しく動作しない場合は、以下を試してください：

1. エミュレータを停止：
   ```bash
   pnpm emulator:stop
   # または VS Codeから: Tasks: Run Task -> Firebase Emulator 停止
   ```

2. エミュレータデータをクリーンアップ：
   ```bash
   rm -rf ./emulator-data
   ```

3. エミュレータを再起動：
   ```bash
   pnpm emulator:start
   ```

### 7.3 モノレポ関連の問題

ワークスペース関連の問題がある場合：

```bash
# ビルドキャッシュをクリーン
pnpm clean

# 依存関係の再インストール
pnpm install
```

### 7.4 Next.jsのキャッシュ問題

Next.jsのビルドキャッシュに問題がある場合：

```bash
# .nextディレクトリを削除
rm -rf apps/web/.next

# 再ビルド
pnpm --filter @suzumina.click/web build
```

## 8. デプロイ

デプロイ関連の詳細な手順は、[デプロイ手順マニュアル](./DEPLOYMENT.md)を参照してください。

現在はステージング環境のみに対してデプロイを行っており、以下の2つの方法があります：

1. **GitHub Actionsを使用したデプロイ** (推奨)
   - 特定の担当者のみが実行可能
   - リポジトリの「Actions」タブから「ステージング環境へのデプロイトリガー」ワークフローを実行

2. **スクリプトを使用した開発者テスト用デプロイ**
   - `scripts/deploy-test.sh` スクリプトを使用
   - GCP認証が必要

## 9. 付録：開発ワークフロー例

### 9.1 新機能開発の基本フロー

1. **ブランチ作成**：`feature/新機能名` という命名規則でブランチを作成
2. **ローカル開発**：エミュレータを起動して開発
3. **単体テスト**：変更に関連するテストを実行・追加
4. **リントとフォーマット**：`pnpm check` でコードスタイルを確認
5. **PRの作成**：開発完了後、PRを作成してレビュー依頼

### 9.2 デバッグの基本フロー

1. **ローカルエミュレータの起動**：`pnpm emulator:start`
2. **開発サーバーの起動**：`pnpm dev`
3. **VS Codeデバッグ設定**：「実行とデバッグ」から「Next.js: デバッグサーバー」を選択
4. **ブレークポイントの設定**：コード内に必要なブレークポイントを設定
5. **デバッグ実行**：デバッグを開始し、ブラウザで操作してブレークポイントで停止

詳細なデバッグ方法については、[リモートデバッグガイド](./REMOTE_DEBUGGING.md)も参照してください。
