# 環境変数設定ガイド

このプロジェクトでは、Firebase認証やYouTube APIなど、外部サービスのキーを環境変数とGCP Secret Managerで管理します。

## 1. ローカル開発用環境変数 (`.env.local`)

ローカル開発環境では、`.env.local`ファイルを使用して環境変数を設定します。

### 1.1 Webアプリケーション用環境変数

`apps/web/.env.local` に以下の設定を行います：

```sh
# Firebase 設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=suzumina-click-firebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloud Codeエミュレータ設定（開発環境でエミュレータを使用する場合）
NEXT_PUBLIC_USE_EMULATOR=true

# Discord OAuth2設定
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_TARGET_GUILD_ID=your_discord_guild_id

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"..."}
```

**環境変数の取得先**:

- **Firebase設定:**
    1. [Firebase Console](https://console.firebase.google.com/)にアクセスします。
    2. プロジェクト「suzumina-click-firebase」を選択します。
    3. 左メニューの歯車アイコン > 「プロジェクトの設定」をクリックします。
    4. 「全般」タブの下部にある「マイアプリ」セクションで、対象のウェブアプリを選択します。
    5. 「SDK の設定と構成」で「構成」を選択し、`firebaseConfig` オブジェクトから必要な値をコピーします。
- **Discord OAuth 設定:**
    1. [Discord Developer Portal](https://discord.com/developers/applications) を開きます。
    2. 「Applications」から該当のアプリケーションを選択します。
    3. 「OAuth2」セクションからClient IDとClient Secretを取得します。
    4. Discord サーバー(ギルド)のIDはサーバーの「設定」→「ウィジェット」で確認できます。

### 1.2 Cloud Functions用環境変数（ローカルテスト時）

`apps/functions/.env.local` に以下の設定を行います：

```sh
# 関数のテスト用環境変数
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_TARGET_GUILD_ID=959095494456537158
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## 2. Cloud Runとクラウド環境の環境変数

Cloud Run環境では、環境変数はSecret Managerで管理し、Terraformを通じてデプロイ時に設定されます。

### 2.1 GCP Secret Managerの設定

**管理されるシークレット:**

- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase APIキー
- `NEXT_PUBLIC_DISCORD_CLIENT_ID`: Discord アプリの Client ID
- `NEXT_PUBLIC_DISCORD_REDIRECT_URI`: Cloud RunのURLを含むリダイレクトURI
- `DISCORD_CLIENT_SECRET`: Discord アプリの Client Secret
- `DISCORD_TARGET_GUILD_ID`: 認証対象のDiscordサーバーID
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase AdminSDKのサービスアカウントキー
- `YOUTUBE_API_KEY`: YouTube Data APIキー

**設定方法:**

1. **Terraform設定**:
   - `terraform/secrets.tf` でシークレットリソースを定義します。
   - `terraform/cloudrun.tf` でCloud Runサービスから参照します。
   - `terraform/functions.tf` でCloud Functionsから参照します。

2. **Secret Managerへの値の設定**:

   ```bash
   # シークレットの値を設定する例
   echo -n "実際の値" | gcloud secrets versions add DISCORD_CLIENT_SECRET \
     --data-file=- --project=suzumina-click-firebase
   ```

3. **GitHub Actions環境変数**:
   - リポジトリの「Settings」>「Secrets and variables」>「Actions」で以下のシークレットを設定:
     - `GCP_PROJECT_ID`: GCPプロジェクトID (`suzumina-click-firebase`)
     - `GCP_SA_KEY`: GitHub Actionsが使用するサービスアカウントのJSONキー

### 2.2 Cloud Functions用の環境変数

Cloud Functions v2では、`defineSecret`を使用してSecret Managerの値を参照します：

```typescript
// functions/src/discordAuth.ts の例
import { defineSecret } from 'firebase-functions/params';

// シークレットの定義
const discordClientId = defineSecret('NEXT_PUBLIC_DISCORD_CLIENT_ID');
const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');

// 関数内での使用
export const discordAuthCallback = onCall(
  { secrets: [discordClientId, discordClientSecret] },
  async (request) => {
    const clientId = discordClientId.value();
    const clientSecret = discordClientSecret.value();
    // ...処理...
  }
);
```

## 3. ローカル開発でのCloud Functionsのテスト

Cloud Functions v2をローカルでテストするには、以下の手順で環境変数を設定します：

1. `apps/functions/.env.local` ファイルに必要な環境変数を設定:

```bash
# 関数のテスト用環境変数
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_TARGET_GUILD_ID=959095494456537158
YOUTUBE_API_KEY=your_youtube_api_key_here

# Nextjsエミュレータフラグ（WebクライアントFirebase接続用）
NEXT_PUBLIC_USE_EMULATOR=true
```

2. 以下のようなヘルパー関数を作成して、エミュレータ環境と本番環境での環境変数の取得方法を統一します:

```typescript
// functions/src/config.ts などに追加
import { defineSecret } from 'firebase-functions/params';

const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');
const youtubeApiKey = defineSecret('YOUTUBE_API_KEY');

// 環境に応じた設定値の取得
export function getSecret(name: string, secretParam: ReturnType<typeof defineSecret>): string {
  // 開発環境では環境変数から、本番環境ではSecret Managerから取得
  return process.env.NODE_ENV === 'development'
    ? process.env[name] || ''
    : secretParam.value();
}

// 使用例
export function getDiscordSecret(): string {
  return getSecret('DISCORD_CLIENT_SECRET', discordClientSecret);
}
```

## 環境変数の命名規則

- `NEXT_PUBLIC_`プレフィックス: クライアントサイド（ブラウザ）からもアクセス可能な環境変数
- プレフィックスなし: サーバーサイドでのみ使用する機密情報（クライアントサイドからはアクセス不可）

## 関連ドキュメント

- [開発環境セットアップガイド](./DEVELOPMENT_SETUP.md)
- [デプロイ手順マニュアル](./DEPLOYMENT.md)
