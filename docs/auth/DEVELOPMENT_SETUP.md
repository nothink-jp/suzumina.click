# 開発環境セットアップ手順

## 1. Discord Developer Portal の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリック
3. アプリケーション名を入力（例：`suzumina-click-dev`）
4. 「OAuth2」設定:
   - Redirects: `http://localhost:3000/api/auth/callback/discord` を追加
   - Scopes: `identify`, `guilds` を有効化
5. クライアントID とクライアントシークレットを保存

## 2. Google Cloud Platform の設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `suzumina-click-dev` を選択

### Cloud Firestore の設定

```bash
# Firestoreを有効化（東京リージョン）
gcloud services enable firestore.googleapis.com
gcloud firestore databases create --region=asia-northeast1
```

### Secret Manager の設定

```bash
# Secret Managerを有効化
gcloud services enable secretmanager.googleapis.com

# 必要なシークレットを作成
gcloud secrets create discord-client-id-dev --data-file=- # Discord Client ID
gcloud secrets create discord-client-secret-dev --data-file=- # Discord Client Secret
gcloud secrets create nextauth-secret-dev --data-file=- # NextAuth Secret
```

### サービスアカウントの設定

```bash
# 開発用サービスアカウントを作成
gcloud iam service-accounts create dev-runtime \
    --display-name="Development Runtime Service Account"

# 必要な権限を付与
gcloud projects add-iam-policy-binding suzumina-click-dev \
    --member="serviceAccount:dev-runtime@suzumina-click-dev.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding suzumina-click-dev \
    --member="serviceAccount:dev-runtime@suzumina-click-dev.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# サービスアカウントキーを作成
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account=dev-runtime@suzumina-click-dev.iam.gserviceaccount.com
```

## 3. ローカル開発環境のセットアップ

```bash
# 依存関係のインストール
cd apps/web
bun install

# 環境変数ファイルの作成
cp .env.example .env.local
```

## 4. 環境変数の設定

`.env.local` に以下の環境変数を設定：

```env
# Discord OAuth2
DISCORD_CLIENT_ID="Discord Developer Portalで取得したクライアントID"
DISCORD_CLIENT_SECRET="Discord Developer Portalで取得したクライアントシークレット"
DISCORD_GUILD_ID="すずみなふぁみりーのギルドID"

# NextAuth.js
NEXTAUTH_SECRET="openssl rand -base64 32 で生成した値"
NEXTAUTH_URL="http://localhost:3000"

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT="suzumina-click-dev"
GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
```

## 5. 開発サーバーの起動

```bash
cd apps/web
bun dev
```

サーバーが起動したら <http://localhost:3000> にアクセスできます。

## 6. 動作確認

1. トップページの認証ボタンをクリック
2. Discord認証画面が表示されることを確認
3. 認証後、ユーザーページにリダイレクトされることを確認

## トラブルシューティング

### GCP関連の問題

1. 認証エラー
   - サービスアカウントキーが正しく設定されているか確認
   - 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` が正しく設定されているか確認

2. Firestore接続エラー
   - Firestoreが有効化されているか確認
   - サービスアカウントに適切な権限が付与されているか確認

### Discord認証の問題

1. リダイレクトエラー
   - OAuth2のリダイレクトURLが正確に設定されているか確認
   - アプリケーションのステータスを確認

2. 認証ループ
   - NEXTAUTH_URL が正しく設定されているか確認
   - NEXTAUTH_SECRET が設定されているか確認

## 補足：本番環境との違い

開発環境は本番環境と以下の点が異なります：

1. GCPプロジェクトが別（dev/prod）
2. Discord アプリケーションが別
3. 環境変数とシークレットの値が異なる
4. サービスアカウントの権限が異なる

本番環境への移行時は、それぞれの設定を適切に行う必要があります。
