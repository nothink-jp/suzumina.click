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
gcloud firestore databases create --location=asia-northeast1
```

### Secret Manager の設定

```bash
# Secret Managerを有効化
gcloud services enable secretmanager.googleapis.com

# 必要なシークレットを作成 (ローカル開発用)
# 注意: 本番環境用のシークレット (例: nextauth-url-dev) も別途作成が必要です
gcloud secrets create discord-client-id-dev --data-file=- # Discord Client ID
gcloud secrets create discord-client-secret-dev --data-file=- # Discord Client Secret
gcloud secrets create nextauth-secret-dev --data-file=- # NextAuth Secret
gcloud secrets create discord-guild-id-dev --data-file=- # Discord Guild ID (ローカル用)
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

## 4. 環境変数の設定 (`.env.local`)

`.env.local` に以下の環境変数を設定します。**このファイルはローカル開発専用であり、Git にコミットしないでください。**

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
GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json" # apps/web からの相対パス
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
   - サービスアカウントキー (`service-account-key.json`) が `apps/web` ディレクトリ直下に存在するか確認
   - 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` が `.env.local` で正しく設定されているか確認

2. Firestore接続エラー
   - Firestoreが有効化されているか確認
   - サービスアカウントに適切な権限 (`roles/datastore.user`) が付与されているか確認

### Discord認証の問題

1. リダイレクトエラー
   - OAuth2のリダイレクトURL (`http://localhost:3000/api/auth/callback/discord`) が Discord Developer Portal で正確に設定されているか確認
   - アプリケーションのステータスを確認

2. 認証ループ / エラー
   - `NEXTAUTH_URL` (`http://localhost:3000`) が `.env.local` で正しく設定されているか確認
   - `NEXTAUTH_SECRET` が `.env.local` で設定されているか確認
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID` が `.env.local` で正しく設定されているか確認

## 補足：本番環境との違い

開発環境 (`.env.local` を使用) と本番環境 (Cloud Run) は以下の点が異なります。

1. **GCPプロジェクト:** 通常、開発用 (`dev`) と本番用 (`prod`) でプロジェクトが分かれます。
2. **Discord アプリケーション:** 開発用と本番用で Discord アプリケーションを分けることが推奨されます（リダイレクトURLなどが異なるため）。
3. **環境変数/シークレットの管理:**
   - **ローカル開発:** `.env.local` ファイルに直接記述します。このファイルは Git 管理下に含めません。
   - **本番環境 (Cloud Run):** 環境変数は Terraform によって GCP Secret Manager から取得され、Cloud Run サービスに設定されます (`iac/environments/dev/main.tf` 参照)。`.env.local` は使用されません。
4. **認証:**
   - **ローカル開発:** サービスアカウントキー (`GOOGLE_APPLICATION_CREDENTIALS`) を使用します。
   - **本番環境 (Cloud Run):** Workload Identity Federation と Cloud Run の実行サービスアカウント (`app-runtime@...`) を使用します。
5. **`NEXTAUTH_URL`:**
   - **ローカル開発:** `http://localhost:3000`
   - **本番環境:** デプロイされた Cloud Run サービスの公開 URL (Secret Manager `nextauth-url-dev` で管理)

本番環境へのデプロイや設定変更は Terraform を通じて行われます。詳細は `docs/gcp/GCP_CICD.md` を参照してください。
