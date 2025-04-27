# 認証システム仕様書

**最終更新: 2025年4月26日**

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
8. 認証完了後、プロフィールページへリダイレクト

### 1.2 コンポーネント構成

- **認証ボタン**: `src/components/ui/AuthButton.tsx`
- **認証コンテキスト**: `src/lib/firebase/AuthProvider.tsx`
- **Firebaseクライアント初期化**: `src/lib/firebase/client.ts`
- **コールバックページ**: `src/app/auth/discord/callback/page.tsx`
- **コールバック処理**: `src/app/auth/discord/callback/CallbackClient.tsx`
- **Server Actions**: `src/app/api/auth/discord/actions.ts`

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

### 3.2 ステージング環境（Cloud Run）

環境変数はSecret Managerで管理し、Terraformで定義されています（`terraform/secrets.tf`）。

## 4. セキュリティ考慮点

- Discord OAuth Secretはサーバーサイド（Server Actions）のみで使用
- Firebase Custom Token生成はServer Actions内のみで実行
- ユーザーIDや認証情報のクライアント側での安全な取り扱い
- 適切なFirebase Security Rulesの設定

## 5. Discord OAuth2設定

### 5.1 Discordアプリケーション設定

Discord Developer Portal（<https://discord.com/developers/applications）で設定：>

1. OAuth2リダイレクトURI:
   - ローカル開発環境: `http://localhost:3000/auth/discord/callback`
   - ステージング環境: `https://[CLOUD_RUN_URL]/auth/discord/callback`

2. スコープ設定:
   - `identify` - ユーザー基本情報取得用
   - `guilds` - 所属サーバー（ギルド）情報取得用

### 5.2 APIエンドポイント

- Discord ユーザー情報取得: `https://discord.com/api/users/@me`
- Discord ギルド情報取得: `https://discord.com/api/users/@me/guilds`

## 6. 認証後のユーザー情報

認証後、以下のユーザー情報が利用可能：

```typescript
interface User {
  uid: string;          // Firebase UID
  displayName: string;  // Discordユーザー名
  photoURL: string;     // Discordアバター画像URL
  providerId: string;   // "discord.com"
  discordId: string;    // Discord固有ユーザーID
  guilds: Guild[];      // 所属Discordサーバー一覧
}
```

## 7. 今後の改善計画

### 7.1 予定されている機能強化

- ユーザーロール管理の拡充
- 所属ギルドに基づく機能制限の実装
- 認証状態の永続化改善

### 7.2 認証システムのモニタリング

- Firebase Authentication利用状況の監視
- 異常な認証パターンの検出
- ユーザーログイン統計の収集
