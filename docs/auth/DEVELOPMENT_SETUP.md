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
# 注意: 本番環境用のシークレットも別途作成が必要です
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

# 必要な権限を付与 (Firestore, Secret Managerへのアクセス)
gcloud projects add-iam-policy-binding suzumina-click-dev \
    --member="serviceAccount:dev-runtime@suzumina-click-dev.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
gcloud projects add-iam-policy-binding suzumina-click-dev \
    --member="serviceAccount:dev-runtime@suzumina-click-dev.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# サービスアカウントキーを作成 (ローカル開発用)
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account=dev-runtime@suzumina-click-dev.iam.gserviceaccount.com
```

## 3. ローカル開発環境のセットアップ

```bash
# 依存関係のインストール (リポジトリルートで実行済みのはず)
# cd apps/web
# bun install

# 環境変数ファイルの作成
cd apps/web
cp .env.example .env.local
```

## 4. 環境変数の設定 (`.env.local`)

`apps/web/.env.local` に、`docs/README.md` の「環境変数の設定」セクションに記載されている変数を設定します。
**このファイルはローカル開発専用であり、Git にコミットしないでください。**
特に `GOOGLE_APPLICATION_CREDENTIALS` は、上記で作成したサービスアカウントキー (`./service-account-key.json`) への `apps/web` からの相対パスを指定してください。

## 5. 開発サーバーの起動

```bash
# apps/web ディレクトリで実行
bun dev
```

サーバーが起動したら <http://localhost:3000> にアクセスできます。

## 6. 動作確認

1. トップページの認証ボタンをクリック
2. Discord認証画面が表示されることを確認
3. 認証後、ユーザーページにリダイレクトされることを確認

## トラブルシューティング

- **GCP関連:** サービスアカウントキーのパス、権限、Firestore/Secret Managerの有効化を確認してください。
- **Discord認証:** Discord Developer PortalのリダイレクトURL、`.env.local` のDiscord関連変数 (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`)、`NEXTAUTH_URL`, `NEXTAUTH_SECRET` を確認してください。

## 補足：本番環境との違い

ローカル開発と本番環境 (Cloud Run) では、GCPプロジェクト、Discordアプリケーション、環境変数/シークレット管理（Secret Manager経由）、認証方法（Workload Identity）、`NEXTAUTH_URL` などが異なります。
本番環境の設定は Terraform (`iac/`) で管理されます。詳細は関連ドキュメント (`docs/gcp/` 配下) を参照してください。

最終更新日: 2025年4月7日
