# Discord認証 Server Actions実装

このディレクトリには、Next.jsのServer Actionsを使用したDiscord認証の実装が含まれています。

## 概要

この実装は、従来Cloud Functionsで行っていたDiscord認証処理をNext.jsのServer Actionsに移行したものです。これにより、Cloud Functionsの1つを削減し、コードの一元管理とメンテナンスの簡素化が可能になります。

## ファイル構成

- `types.ts` - Discord認証関連の型定義
- `utils.ts` - ヘルパー関数（アバターURL生成、環境変数検証など）
- `index.ts` - Server Actions実装（Discord認証処理）

## 認証フロー

1. ユーザーがDiscordログインボタンをクリック
2. Discord OAuth2認証ページへリダイレクト
3. ユーザーが認証を許可
4. Discordからコールバックページへリダイレクト（認証コード付き）
5. コールバックページでServer Actionを呼び出し
6. Server Actionが以下を実行：
   - Discordからアクセストークンを取得
   - ユーザー情報とギルド所属を確認
   - Firebase Authでユーザー情報を更新/作成
   - カスタムトークンを生成して返却
7. フロントエンドでカスタムトークンを使用してFirebase Authにサインイン
8. サインイン成功後、IDトークンを取得してサーバーにセッションクッキー作成をリクエスト
9. サーバーはIDトークンを検証し、HTTPOnlyセッションクッキーを設定

## 使用方法

### 環境変数の設定

以下の環境変数を設定する必要があります：

```
# Discord OAuth2設定
NEXT_PUBLIC_DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://your-domain.com/auth/discord/callback
DISCORD_TARGET_GUILD_ID=your-discord-guild-id

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Server Actionの呼び出し

```typescript
import { handleDiscordCallback } from "@/app/actions/auth/discord";
import { createSessionCookie } from "@/app/actions/auth/createSessionCookie";
import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";

// Discord認証フロー
async function handleAuth(code) {
  // 1. Discord認証コードを使用して認証処理を実行
  const result = await handleDiscordCallback(code);
  
  if (!result.success || !result.customToken) {
    throw new Error(result.error || "認証に失敗しました");
  }
  
  // 2. カスタムトークンを使用してFirebase Authにサインイン
  await signInWithCustomToken(auth, result.customToken);
  
  // 3. IDトークンを取得
  const idToken = await auth.currentUser?.getIdToken(true);
  
  // 4. サーバーでセッションクッキーを作成
  if (idToken) {
    await createSessionCookie(idToken);
  }
}
```

## セキュリティ上の考慮事項

1. **サービスアカウントキーの管理**：
   - 本番環境では、サービスアカウントキーをJSON文字列として環境変数に保存するのではなく、Secret Managerを使用して管理することを推奨します。
   - Cloud Runでは、サービスアカウントの権限を適切に設定し、必要最小限の権限を付与します。

2. **トークンの受け渡し**：
   - セッションクッキーはHTTPOnly属性を設定し、JavaScriptからアクセスできないようにします。
   - 本番環境ではSecure属性を有効にし、HTTPS接続のみでクッキーを送信します。

3. **エラーハンドリング**：
   - ユーザーフレンドリーなエラーメッセージを表示します。
   - 詳細なエラーログをサーバーサイドで記録します。

## テスト

Server Actionsのテストを作成する際は、以下の点に注意してください：

1. 環境変数のモック
2. Discord APIのモック
3. Firebase Admin SDKのモック

```typescript
// テスト例
import { handleDiscordCallback } from "./index";
import axios from "axios";

// axiosのモック
vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("handleDiscordCallback", () => {
  // テストケースを実装
});
```