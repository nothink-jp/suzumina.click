# 環境変数設定ガイド

このプロジェクトでは、Firebase プロジェクト設定や Discord アプリケーションの認証情報、YouTube API キーなど、外部サービスのキーを環境変数やシークレットで管理します。

## 1. フロントエンド用環境変数 (`.env.local`)

Next.js アプリケーション（フロントエンド）で使用する環境変数は、プロジェクトルートに作成する `.env.local` ファイルに記述します。このファイルは `.gitignore` に含まれているため、Git リポジトリにはコミットされません。

**ファイル:** `.env.local` (プロジェクトルートに作成)

**必要な変数:**

```bash
# Firebase プロジェクト設定 (Firebase Console から取得)
# プロジェクト設定 > 全般 > マイアプリ > SDK の設定と構成 で「構成」を選択
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
# NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-... (オプション)

# Discord OAuth 設定 (Discord Developer Portal から取得)
# アプリケーション > OAuth2 > General
NEXT_PUBLIC_DISCORD_CLIENT_ID=... (Discord アプリの Client ID)

# Discord OAuth リダイレクト URI (環境に応じて設定)
# ローカル開発 (Next.js dev サーバー): http://localhost:3000/auth/discord/callback
# Firebase Hosting デプロイ後: https://your-project-id.web.app/auth/discord/callback (またはカスタムドメイン)
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Firebase Functions コールバックエンドポイント URL (環境に応じて設定)
# ローカル開発 (Firebase Emulator): http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback
# Firebase Functions デプロイ後: Firebase Console の Functions ページで確認できるトリガー URL
NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL=http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback
```

**取得方法:**

- **Firebase プロジェクト設定:**
    1. [Firebase Console](https://console.firebase.google.com/) を開きます。
    2. 対象のプロジェクト (`suzumina-click-firebase`) を選択します。
    3. 左メニューの歯車アイコン > 「プロジェクトの設定」をクリックします。
    4. 「全般」タブの下部にある「マイアプリ」セクションで、対象のウェブアプリを選択します（なければ作成）。
    5. 「SDK の設定と構成」で「構成」を選択すると、`firebaseConfig` オブジェクトが表示されます。この中の値をコピーして `.env.local` に貼り付け、変数名のプレフィックスを `NEXT_PUBLIC_FIREBASE_` に変更します。
- **Discord OAuth 設定:**
    1. [Discord Developer Portal](https://discord.com/developers/applications) を開きます。
    2. 対象のアプリケーションを選択します。
    3. 「OAuth2」>「General」メニューで `CLIENT ID` を確認します。
    4. `REDIRECTS` セクションに、上記の `NEXT_PUBLIC_DISCORD_REDIRECT_URI` に設定する予定の URL (ローカル用とデプロイ後用) を**両方とも**追加し、保存します。

**注意:**

- `NEXT_PUBLIC_` プレフィックスが付いた変数は、ブラウザ側（フロントエンド）のコードからアクセス可能です。機密情報（API Secret など）にはこのプレフィックスを付けないでください。
- `.env.local` ファイルを変更した後は、Next.js 開発サーバーの再起動が必要です。

## 2. バックエンド用環境変数 (Firebase Functions)

Cloud Functions で使用する機密情報（Discord Client Secret, YouTube API Key など）は、GCP Secret Manager を使用して安全に管理します。Terraform でシークレットリソースを作成し、Cloud Functions の定義で参照します。

**管理されるシークレット:**

- `DISCORD_CLIENT_ID`: Discord アプリの Client ID (Terraform で `google_secret_manager_secret` リソース作成)
- `DISCORD_CLIENT_SECRET`: Discord アプリの Client Secret (Terraform で `google_secret_manager_secret` リソース作成)
- `DISCORD_REDIRECT_URI`: Discord OAuth リダイレクト URI (Terraform で `google_secret_manager_secret` リソース作成)
- `DISCORD_TARGET_GUILD_ID`: 認証対象の Discord サーバー ID (Terraform で `google_secret_manager_secret` リソース作成)
- `YOUTUBE_API_KEY`: YouTube Data API キー (Terraform で `google_secret_manager_secret` リソース作成)

**設定方法 (Terraform & GCP Console):**

1. **Terraform:**
    - `terraform/secrets.tf` で各シークレットに対応する `google_secret_manager_secret` リソースを定義します。
    - `terraform/functions.tf` の各 `google_cloudfunctions2_function` リソース定義内で、`service_config.secret_environment_variables` ブロックを使用して、関数がアクセスするシークレットを指定します。
    - `terraform/iam.tf` で、各関数のサービスアカウントに必要なシークレットへのアクセス権 (`roles/secretmanager.secretAccessor`) を `google_secret_manager_secret_iam_member` リソースで付与します。
2. **GCP Console (初回のみ):**
    - Terraform でシークレットの「入れ物」を作成した後、GCP Console の Secret Manager ページに移動します。
    - 作成された各シークレット（例: `DISCORD_CLIENT_SECRET`, `YOUTUBE_API_KEY`）を選択し、「新しいバージョンを追加」をクリックして、実際のキーや値を最初のバージョンとして登録します。
    - **重要:** これらの値は機密情報のため、Terraform コードや Git リポジトリには含めません。

**取得方法:**

- **Discord Client ID, Client Secret:** Discord Developer Portal のアプリケーション > 「OAuth2」>「General」メニューで確認・再生成できます。
- **Discord Redirect URI:** フロントエンドの `.env.local` に設定した `NEXT_PUBLIC_DISCORD_REDIRECT_URI` と**同じ値**を設定します。Discord Developer Portal にも登録されている必要があります。
- **Target Guild ID:** `docs/INFO.md` に記載されている `959095494456537158` を使用します。
- **YouTube API Key:** [Google Cloud Console](https://console.cloud.google.com/) の「APIとサービス」>「認証情報」ページで作成・取得します。YouTube Data API v3 を有効化しておく必要があります。

**コードからの参照:**

`functions/src/index.ts` 内では、`secrets` オプションで指定したシークレットは `process.env` 経由で参照できます。

```typescript
// 例: functions/src/index.ts 内
import { defineSecret } from 'firebase-functions/params';

// シークレットの定義 (デプロイ時に Secret Manager の値が注入される)
const discordClientId = defineSecret('DISCORD_CLIENT_ID');
const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET');
const discordRedirectUri = defineSecret('DISCORD_REDIRECT_URI');
const discordTargetGuildId = defineSecret('DISCORD_TARGET_GUILD_ID');
const youtubeApiKey = defineSecret('YOUTUBE_API_KEY'); // 追加

// 関数内での参照例 (discordAuthCallback 関数など)
export const discordAuthCallback = onCall(
  { secrets: [discordClientId, discordClientSecret, discordRedirectUri, discordTargetGuildId] },
  async (request) => {
    const clientId = discordClientId.value(); // .value() で値を取得
    const clientSecret = discordClientSecret.value();
    // ...
  }
);

// 関数内での参照例 (fetchYouTubeVideos 関数など)
export const fetchYouTubeVideos = onMessagePublished(
  { topic: 'youtube-video-fetch-trigger', secrets: [youtubeApiKey] },
  async (event) => {
    const apiKey = youtubeApiKey.value(); // .value() で値を取得
    // ...
  }
);
```

**注意:**

- Terraform で `secret_environment_variables` を設定し、Cloud Functions v2 の `secrets` オプションを使用すると、関数はデプロイ時に指定されたシークレットの最新バージョンを安全に利用できます。`process.env` ではなく、`defineSecret` で定義した Secret Parameter オブジェクトの `.value()` メソッド経由でアクセスします。
- ローカルで Firebase Emulator を使用する場合、これらのシークレットをエミュレータ環境で利用可能にするための設定（例: `.env.local` や環境変数での設定）が別途必要になる場合があります。Firebase Emulator のドキュメントを参照してください。

## 3. ローカル開発 (Firebase Emulator)

Firebase Emulator を使用してローカルで開発する場合、環境変数の設定方法が異なります。

- **フロントエンド (`.env.local`):**
  - `NEXT_PUBLIC_DISCORD_REDIRECT_URI`: `http://localhost:3000/auth/discord/callback` を設定します。
  - `NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL`: Firebase Emulator の Functions URL を設定します。デフォルトでは `http://127.0.0.1:5001/YOUR_PROJECT_ID/YOUR_REGION/discordAuthCallback` の形式になります。`firebase.json` の `emulators` 設定を確認してください。
    - 例: `http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback`
- **バックエンド (Functions Emulator):**
  - Secret Manager の値 (`DISCORD_CLIENT_SECRET`, `YOUTUBE_API_KEY` など) は、エミュレータ起動時に特別な設定が必要です。Firebase Emulator のドキュメントに従い、`.env.local` ファイルや環境変数、または `--import` オプションなどでエミュレータに値を渡す方法があります。
  - 例 (`.env.local` を使用する場合、`.gitignore` に追加すること):
    ```sh
    # .env.local (プロジェクトルート)
    DISCORD_CLIENT_SECRET=YOUR_DISCORD_SECRET_VALUE_HERE
    YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_VALUE_HERE
    # 他のシークレットも同様に追加
    ```
  - Functions コード内では、エミュレータ実行時は `defineSecret` で定義した値が直接利用できないため、`process.env` から読み込むなどのフォールバック処理が必要になる場合があります。

    ```typescript
    // 例: functions/src/config.ts (など)
    import { defineSecret } from 'firebase-functions/params';

    const discordClientSecretParam = defineSecret('DISCORD_CLIENT_SECRET');
    const youtubeApiKeyParam = defineSecret('YOUTUBE_API_KEY');

    // エミュレータ実行時 (process.env.FUNCTIONS_EMULATOR === 'true') は process.env から、
    // 本番環境では defineSecret().value() から値を取得するヘルパー関数などを用意すると良い
    export const getDiscordClientSecret = (): string => {
      return process.env.FUNCTIONS_EMULATOR === 'true'
        ? process.env.DISCORD_CLIENT_SECRET ?? ''
        : discordClientSecretParam.value();
    };

    export const getYoutubeApiKey = (): string => {
      return process.env.FUNCTIONS_EMULATOR === 'true'
        ? process.env.YOUTUBE_API_KEY ?? ''
        : youtubeApiKeyParam.value();
    };
    ```

詳細は Firebase Emulator のドキュメントを参照してください。
