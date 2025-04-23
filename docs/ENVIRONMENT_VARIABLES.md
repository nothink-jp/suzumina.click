# 環境変数設定ガイド

このプロジェクトでは、Firebase認証やYouTube APIなど、外部サービスのキーを環境変数とGCP Secret Managerで管理します。

## 1. ローカル開発用環境変数 (`.env.local`)

Next.jsアプリケーション開発時に使用する環境変数は、**`apps/web` ディレクトリ**に作成する `.env.local` ファイルに記述します。このファイルは `.gitignore` に含まれているため、Gitリポジトリにはコミットされません。

**ファイル:** `apps/web/.env.local` (Webアプリケーションディレクトリに作成)

**必要な変数:**

```bash
# Firebase プロジェクト設定 (Firebase Console から取得)
# プロジェクト設定 > 全般 > マイアプリ > SDK の設定と構成 で「構成」を選択
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=suzumina-click-firebase.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=suzumina-click-firebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=suzumina-click-firebase.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEFGHIJ

# Discord OAuth 設定 (Discord Developer Portal から取得)
# フロントエンドとサーバーサイドの両方で使用する変数にはNEXT_PUBLIC_プレフィックスを付ける
NEXT_PUBLIC_DISCORD_CLIENT_ID=123456789012345678 
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# サーバーサイドのみで使用する環境変数（機密情報）
# クライアント側からは参照できないためNEXT_PUBLICプレフィックスは使用しない
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_TARGET_GUILD_ID=959095494456537158

# Firebase Admin SDK
# 本番環境ではSecret Managerを使用することを推奨
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# YouTube Data API Key
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**取得方法:**

- **Firebase プロジェクト設定:**
    1. [Firebase Console](https://console.firebase.google.com/) を開きます。
    2. プロジェクト `suzumina-click-firebase` を選択します。
    3. 左メニューの歯車アイコン > 「プロジェクトの設定」をクリックします。
    4. 「全般」タブの下部にある「マイアプリ」セクションで、対象のウェブアプリを選択します。
    5. 「SDK の設定と構成」で「構成」を選択し、`firebaseConfig` オブジェクトから必要な値をコピーします。
- **Discord OAuth 設定:**
    1. [Discord Developer Portal](https://discord.com/developers/applications) を開きます。
    2. 対象のアプリケーションを選択します。
    3. 「OAuth2」>「General」メニューで `CLIENT ID` と `CLIENT SECRET` を確認します。
    4. `REDIRECTS` セクションに、ローカル用とCloud Run用の両方のURLを追加します。

**注意:**

- `NEXT_PUBLIC_` プレフィックスが付いた変数は、ブラウザ側（フロントエンド）のコードからアクセス可能です。
- サーバーサイドのみで使用する機密情報には `NEXT_PUBLIC_` プレフィックスを付けないでください。
- `.env.local` ファイルを変更した後は、Next.js開発サーバーの再起動が必要です。

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
```

2. 以下のようなヘルパー関数を作成して、エミュレータ環境と本番環境での環境変数の取得方法を統一します:

```typescript
// functions/src/config.ts などに追加
import { defineSecret } from 'firebase-functions/params';

const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');
const youtubeApiKey = defineSecret('YOUTUBE_API_KEY');

// 環境に応じた設定値の取得
export function getSecret(name: string, secretParam: ReturnType<typeof defineSecret>): string {
  // エミュレータ環境では環境変数から、本番環境ではSecret Managerから取得
  return process.env.FUNCTIONS_EMULATOR === 'true'
    ? process.env[name] || ''
    : secretParam.value();
}

// 使用例
export function getDiscordSecret(): string {
  return getSecret('DISCORD_CLIENT_SECRET', discordClientSecret);
}
```

## 環境変数の命名規則

プロジェクト全体で一貫した環境変数の命名規則を使用します:

1. **クライアント側とサーバー側の両方で使用する変数**: `NEXT_PUBLIC_` プレフィックスを付ける
   - 例: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_DISCORD_CLIENT_ID`

2. **サーバー側のみで使用する変数**: プレフィックスなし
   - 例: `DISCORD_CLIENT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY`

3. **サービス別のグループ化**: サービス名を含める
   - Firebase関連: `FIREBASE_`, `NEXT_PUBLIC_FIREBASE_`
   - Discord関連: `DISCORD_`, `NEXT_PUBLIC_DISCORD_`
   - YouTube関連: `YOUTUBE_`

この命名規則に従うことで、環境変数の管理が容易になり、不要な重複や混乱を避けることができます。

## 関連ドキュメント

以下のドキュメントも環境変数の設定に関連する情報を含んでいます：

- [開発環境セットアップガイド](./DEVELOPMENT_SETUP.md#13-環境変数の設定)
- [デプロイ手順マニュアル](./DEPLOYMENT.md#環境変数の設定)
- [認証設計](./AUTH.md#環境別設定)
- [インフラ監査レポート](./INFRA_AUDIT.md#11-リソース管理の方式)
- [Discord認証移行計画](./discord_auth_migration.md#3-環境変数の設定)
