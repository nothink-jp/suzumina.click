# Discord ギルドメンバー限定 認証設計 (概要)

## 1. 目標

- Web サイト右上にログインボタンを設置する。
- Discord アカウントで認証を行う。
- 指定された Discord ギルド ID (`959095494456537158`) に所属しているユーザーのみログインを許可する。
- Firebase Authentication, Firebase Hosting, Firebase Cloud Functions (v2) を使用して実装する。

## 2. アーキテクチャ概要

1.  **フロントエンド (Next.js on Firebase Hosting):** UI 提供、Discord 認証フロー開始、Firebase Auth サインイン。
2.  **バックエンド (Firebase Cloud Functions v2):** Discord OAuth2 通信、ギルド所属検証、Firebase カスタムトークン生成。
3.  **Firebase Authentication:** ユーザーセッション管理、カスタムトークン認証。Discord から取得したユーザー情報 (表示名、メール、アバターURL) も保存。
4.  **Discord API:** ユーザー認証、ユーザー情報取得 (identify, email スコープ)、所属ギルド情報取得 (guilds スコープ)。

## 3. 認証フロー概要

1.  ユーザーがフロントエンドのログインボタンをクリックし、Discord の認証ページへリダイレクトされる。
2.  ユーザーが Discord で認証・アプリ連携を承認すると、認証コード付きでフロントエンドのコールバック URL (`/auth/discord/callback`) へリダイレクトされる。
3.  フロントエンドは受け取った認証コードをバックエンド (Cloud Functions: `discordAuthCallback`) へ送信する。
4.  バックエンドは認証コードを使い、Discord API と通信してアクセストークン、ユーザー情報、所属ギルド情報を取得する。
5.  バックエンドは取得した情報をもとに、指定ギルドへの所属を検証する。
6.  検証に成功した場合、バックエンドは Firebase Admin SDK を使用して Firebase カスタムトークンを生成し、フロントエンドへ返す。
7.  フロントエンドは受け取ったカスタムトークンを使用し、Firebase Authentication でサインインする (`signInWithCustomToken`)。
8.  サインイン成功後、フロントエンドはログイン状態 (ユーザー名、アバター表示など) を更新する。
9.  ギルド非所属やその他のエラーが発生した場合は、エラーメッセージをユーザーに表示する。

## 4. 主要コンポーネント/エンドポイント

- **フロントエンド:**
    - `/auth/discord/callback`: Discord からのリダイレクトを受け付け、Cloud Functions を呼び出すページ。
    - `src/components/ui/AuthButton.tsx`: ログイン/ログアウト状態を表示・処理するボタン。
    - `src/lib/firebase/AuthProvider.tsx`: Firebase 認証状態を提供する Context Provider。
- **バックエンド:**
    - Cloud Functions HTTP トリガー: `discordAuthCallback` (POST `/discord/auth/callback`)。

## 5. 環境変数/シークレット管理

フロントエンドおよびバックエンドで使用する環境変数やシークレット（Discord API キー、Firebase 設定など）については、`docs/ENVIRONMENT_VARIABLES.md` を参照してください。