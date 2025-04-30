# 認証システム仕様書

**最終更新: 2025年4月30日**

## 概要

本プロジェクトでは、Discord OAuth2認証を使用してユーザー認証を行います。Firebaseは認証機能のみに使用し、その他の機能（ホスティング等）はCloud Runに移行済みです。

## 1. 認証フロー

### 1.1 認証の流れ

1. ユーザーがWebアプリケーションの「Discordでログイン」ボタンをクリック
2. Discord OAuth2認証画面にリダイレクト
3. ユーザーが承認 → Discordからコールバックページへリダイレクト
4. コールバックページでNext.js Server Actionsを呼び出し
5. Server ActionsがDiscordトークン検証とユーザー情報取得を実行
6. 取得した情報をFirebase Custom Tokenに変換
7. Webクライアントで受け取ったCustom Tokenを使ってFirebase認証
8. 認証成功後、IDトークンを取得してサーバーにセッションクッキー作成をリクエスト
9. サーバーはIDトークンを検証し、長期間有効なセッションクッキーを設定
10. ユーザーは完全な認証状態になり、クライアントとサーバー両方でログイン状態が維持される

### 1.2 コンポーネント構成

- **認証ボタン**: `src/components/ui/AuthButton.tsx`
- **認証モーダル**: `src/components/ui/AuthModal.tsx`
- **認証コンテキスト**: `src/lib/firebase/AuthProvider.tsx`
- **Firebaseクライアント初期化**: `src/lib/firebase/client.ts`
- **コールバックページ**: `src/app/auth/discord/callback/page.tsx`
- **Server Actions**:
  - Discord認証: `src/app/api/auth/discord/actions.ts`
  - セッションクッキー作成: `src/app/api/auth/createSessionCookie.ts`
  - セッションクッキー削除: `src/app/api/auth/revokeSession.ts`
  - ユーザー情報取得: `src/app/api/auth/getCurrentUser.ts`

## 2. 技術構成

### 2.1 使用技術

- **フロントエンド認証**: Firebase Authentication (Client SDK)
- **バックエンド認証処理**: Next.js Server Actions
- **OAuth連携**: Discord OAuth2
- **認証情報保存**: Firebase Authentication + Firestore

### 2.2 Firebase利用範囲

**重要**: Cloud Run移行後、Firebaseは以下の機能のみに使用されています：

- ✅ **Firebase Authentication**: Discord OAuth連携とユーザー情報保存
- ❌ **Cloud Functions**: Discord認証はServer Actionsに移行完了
- ✅ **Firestore**: ユーザーデータ保存

以下の機能は使用を**停止**しています：

- ❌ **Firebase Hosting**: Cloud Runに完全移行済み
- ❌ **Firebase Storage**: 現在未使用
- ❌ **Firebase プレビューチャネル**: 開発環境の簡素化に伴い廃止

## 3. 環境別設定

### 3.1 ローカル開発環境

`.env.local` に以下の環境変数を設定：

```sh
# Firebase 設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=suzumina-click-firebase

# Discord OAuth2設定
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_TARGET_GUILD_ID=your_discord_guild_id

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"..."}
```

### 3.2 ステージング/本番環境（Cloud Run）

環境変数はSecret Managerで管理し、Terraformで定義されています（`terraform/secrets.tf`）。

## 4. セキュリティ考慮点

- Discord OAuth Secretはサーバーサイド（Server Actions）のみで使用
- Firebase Custom Token生成はServer Actions内のみで実行
- ユーザーIDや認証情報のクライアント側での安全な取り扱い
- セッションクッキーは `HttpOnly` 属性を設定し、JavaScriptからのアクセスを防止
- 本番環境では `Secure` 属性を有効にし、HTTPS接続のみでクッキーを送信
- 適切なFirebase Security Rulesの設定

## 5. Discord OAuth2設定

### 5.1 Discordアプリケーション設定

Discord Developer Portal（<https://discord.com/developers/applications>）で設定：

1. OAuth2リダイレクトURI:
   - ローカル開発環境: `http://localhost:3000/auth/discord/callback`
   - ステージング環境: `https://[CLOUD_RUN_URL]/auth/discord/callback`

2. スコープ設定:
   - `identify` - ユーザー基本情報取得用
   - `guilds` - 所属サーバー（ギルド）情報取得用
   - `email` - メールアドレス取得用（オプション）

### 5.2 APIエンドポイント

- Discord ユーザー情報取得: `https://discord.com/api/users/@me`
- Discord ギルド情報取得: `https://discord.com/api/users/@me/guilds`

## 6. 認証後のユーザー情報

認証後、以下のユーザー情報が利用可能：

```typescript
interface User {
  uid: string;          // Firebase UID（Discord IDと同一）
  displayName: string;  // Discordユーザー名
  photoURL: string;     // Discordアバター画像URL
  providerId: string;   // "discord.com"
  email: string | null; // メールアドレス（存在する場合）
}
```

## 7. クライアントとサーバー間の認証状態同期

### 7.1 クライアント認証からサーバー認証への同期

1. クライアント側で Firebase Authentication にサインイン
2. Firebase IDトークンを取得
3. IDトークンをサーバーに送信して検証
4. サーバーは検証後、HTTPOnlyクッキーにセッション情報を保存
5. 以降のリクエストでは自動的にクッキーが送信される

### 7.2 セッションの有効期間と更新

- セッションクッキーのデフォルト有効期間は2週間
- クライアント側で新しいIDトークンが生成された場合、セッションクッキーも更新可能
- ログアウト時には明示的にセッションクッキーを削除

## 8. 今後の改善計画

### 8.1 予定されている機能強化

- ユーザーロール管理の拡充
- 所属ギルドに基づく機能制限の実装
- トークンリフレッシュ処理の自動化

### 8.2 認証システムのモニタリング

- Firebase Authentication利用状況の監視
- 異常な認証パターンの検出
- ユーザーログイン統計の収集
