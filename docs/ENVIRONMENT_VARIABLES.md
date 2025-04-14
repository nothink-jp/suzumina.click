# 環境変数設定ガイド

このプロジェクトでは、Firebase プロジェクト設定や Discord アプリケーションの認証情報など、外部サービスのキーを環境変数で管理します。

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

*   **Firebase プロジェクト設定:**
    1.  [Firebase Console](https://console.firebase.google.com/) を開きます。
    2.  対象のプロジェクト (`suzumina-click-firebase`) を選択します。
    3.  左メニューの歯車アイコン > 「プロジェクトの設定」をクリックします。
    4.  「全般」タブの下部にある「マイアプリ」セクションで、対象のウェブアプリを選択します（なければ作成）。
    5.  「SDK の設定と構成」で「構成」を選択すると、`firebaseConfig` オブジェクトが表示されます。この中の値をコピーして `.env.local` に貼り付け、変数名のプレフィックスを `NEXT_PUBLIC_FIREBASE_` に変更します。
*   **Discord OAuth 設定:**
    1.  [Discord Developer Portal](https://discord.com/developers/applications) を開きます。
    2.  対象のアプリケーションを選択します。
    3.  「OAuth2」>「General」メニューで `CLIENT ID` を確認します。
    4.  `REDIRECTS` セクションに、上記の `NEXT_PUBLIC_DISCORD_REDIRECT_URI` に設定する予定の URL (ローカル用とデプロイ後用) を**両方とも**追加し、保存します。

**注意:**

*   `NEXT_PUBLIC_` プレフィックスが付いた変数は、ブラウザ側（フロントエンド）のコードからアクセス可能です。機密情報（API Secret など）にはこのプレフィックスを付けないでください。
*   `.env.local` ファイルを変更した後は、Next.js 開発サーバーの再起動が必要です。

## 2. バックエンド用環境変数 (Firebase Functions)

Cloud Functions で使用する機密情報（Discord Client Secret など）は、Firebase の環境設定機能または Secret Manager を使用して安全に管理します。

**設定方法 (Firebase CLI):**

ターミナルでプロジェクトルートに移動し、以下のコマンドを実行します。`YOUR_...` の部分を実際の値に置き換えてください。

```bash
# 通常の設定値 (Client ID, Redirect URI, Target Guild ID)
firebase functions:config:set discord.client_id="YOUR_DISCORD_CLIENT_ID" discord.redirect_uri="YOUR_DISCORD_REDIRECT_URI" discord.target_guild_id="959095494456537158" --project=suzumina-click-firebase

# 機密情報 (Client Secret) - Secret Manager を使用
# プロンプトが表示されたら、Discord アプリの Client Secret を入力します。
firebase functions:secrets:set DISCORD_CLIENT_SECRET --project=suzumina-click-firebase

# シークレットへのアクセス許可
# 上記コマンド実行後、どの関数からアクセスを許可するか聞かれます。
# `discordAuthCallback` を選択してください。
# (もし後で設定する場合: firebase functions:secrets:grant-access DISCORD_CLIENT_SECRET --functions=discordAuthCallback --project=suzumina-click-firebase)
```

**取得方法:**

*   **Discord Client ID, Client Secret:** Discord Developer Portal のアプリケーション > 「OAuth2」>「General」メニューで確認・再生成できます。
*   **Discord Redirect URI:** フロントエンドの `.env.local` に設定した `NEXT_PUBLIC_DISCORD_REDIRECT_URI` と**同じ値**を設定します。Discord Developer Portal にも登録されている必要があります。
*   **Target Guild ID:** `docs/INFO.md` に記載されている `959095494456537158` を使用します。

**コードからの参照:**

`functions/src/index.ts` 内では、以下のように参照します。

```typescript
import * as functions from "firebase-functions";

// 通常の設定値
const discordConfig = functions.config().discord;
const clientId = discordConfig?.client_id;
const redirectUri = discordConfig?.redirect_uri;
const targetGuildId = discordConfig?.target_guild_id;

// Secret Manager で管理する値
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
```

**注意:**

*   `functions.config()` で設定した値は、関数のデプロイ後に反映されます。
*   `process.env` で参照するシークレットは、`onRequest` の `secrets` オプションで指定し、アクセス許可を与える必要があります。
*   ローカルで Firebase Emulator を使用する場合、これらの環境変数をエミュレータに設定する方法が別途必要になります（`.env.local` や `runtimeconfig.json` を利用するなど）。

## 3. ローカル開発 (Firebase Emulator)

Firebase Emulator を使用してローカルで開発する場合、環境変数の設定方法が異なります。

*   **フロントエンド (`.env.local`):**
    *   `NEXT_PUBLIC_DISCORD_REDIRECT_URI`: `http://localhost:3000/auth/discord/callback` を設定します。
    *   `NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL`: Firebase Emulator の Functions URL を設定します。デフォルトでは `http://127.0.0.1:5001/YOUR_PROJECT_ID/YOUR_REGION/discordAuthCallback` の形式になります。`firebase.json` の `emulators` 設定を確認してください。
        *   例: `http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback`
*   **バックエンド (Functions Emulator):**
    *   `functions.config()` で設定した値は、エミュレータ起動時に自動で読み込まれない場合があります。`firebase functions:config:get > functions/.runtimeconfig.json` コマンドで設定をファイルに書き出し、エミュレータが読み込めるようにする方法があります。
    *   Secret Manager の値 (`process.env.DISCORD_CLIENT_SECRET`) は、エミュレータ起動時に特別な設定が必要です。`.secret.local` ファイルを作成し、`DISCORD_CLIENT_SECRET=YOUR_SECRET` のように記述する方法があります。詳細は Firebase Emulator のドキュメントを参照してください。