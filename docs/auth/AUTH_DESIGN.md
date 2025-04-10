# 認証システム設計

## アーキテクチャ概要

```mermaid
sequenceDiagram
    actor User
    participant Next as Next.js App
    participant Auth as NextAuth.js
    participant Discord as Discord OAuth
    participant DB as SQLite/PostgreSQL

    User->>Next: アクセス
    Next->>Auth: セッション確認
    Auth->>Discord: OAuth2認証
    Discord-->>Auth: アクセストークン
    Auth->>Discord: ギルドメンバー確認
    Discord-->>Auth: メンバーシップ情報
    Auth->>DB: ユーザー情報保存/更新
    DB-->>Auth: 完了
    Auth-->>Next: 認証情報
    Next-->>User: ページ表示
```

## 認証フロー

1. ユーザーがログインボタンをクリック
2. Discord OAuth2認証画面にリダイレクト
3. ユーザーが認証を許可
4. コールバックURLで認証情報を受け取り
5. ギルドメンバーシップを確認
6. データベースにユーザー情報を保存/更新
7. セッションを作成してトップページへリダイレクト

## データモデル

### データベーススキーマ

```typescript
// users テーブル
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  role: text("role").notNull().default("member"),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// accounts テーブル（OAuth連携用）
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

// sessions テーブル
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// verification_tokens テーブル
export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});
```

## 実装詳細

### 必要なパッケージ

```bash
bun add next-auth@beta drizzle-orm @libsql/client
bun add -d drizzle-kit
```

### 環境変数

```env
DISCORD_CLIENT_ID="DiscordアプリケーションのクライアントID"
DISCORD_CLIENT_SECRET="Discordアプリケーションのシークレット"
DISCORD_GUILD_ID="すずみなふぁみりーのギルドID"
NEXTAUTH_SECRET="NextAuthシークレット"
NEXTAUTH_URL="https://suzumina.click"
DATABASE_URL="file:./dev.db" # 開発環境
# DATABASE_URL="postgres://user:password@host:port/database" # 本番環境
```

## セキュリティ考慮事項

1. セッションの安全な管理
   - JWT署名の使用
   - セキュアなクッキー設定

2. 権限の適切な制御
   - ギルドメンバーのみアクセス可能
   - ユーザー固有のデータへのアクセス制限

3. データの保護
   - 必要最小限の情報のみ保存
   - 定期的なデータクリーンアップ
   - トークン情報の暗号化（本番環境）

## エラーページ設計

### コンポーネント構造

```mermaid
graph TD
    A[ErrorLayout] --> B[ErrorDisplay]
    B --> C[ErrorActions]
    B --> D[ErrorTrackingInfo]
```

各コンポーネントは標準HTMLエレメントを使用して構築され、Tailwind CSSでスタイリングされます。

### ファイル構造

```sh
src/
├── app/
│   └── auth/
│       ├── error/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── not-member/
│       │   └── page.tsx
│       └── signin/
│           ├── layout.tsx
│           └── page.tsx
├── auth/
│   ├── callbacks.ts
│   ├── drizzle-adapter.ts
│   └── utils.ts
├── db/
│   ├── index.ts
│   ├── migrate.ts
│   └── schema.ts
└── components/
    ├── ErrorActions.tsx
    ├── ErrorDisplay.tsx
    └── ErrorTrackingInfo.tsx
```

### ルーティング設計

- `/auth/signin` - ログインページ
- `/auth/error` - エラーページ
- `/auth/not-member` - 非メンバーエラーページ
- `/api/auth/[...nextauth]` - 認証API

### アクセス制御

ミドルウェア (`src/middleware.ts`) を使用して、特定のパスへのアクセスを制御します。

```typescript
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
// ... (他のインポート)

export default auth((req) => {
  // 未認証ユーザーは /auth/signin へリダイレクト
  // 非メンバーユーザーは /auth/not-member へリダイレクト
  // 認証済みメンバーはトップページへリダイレクト
  // ... (詳細なロジック)
});

export const config = {
  matcher: [
    "/auth/:path*",   // 認証関連ページ
    "/",              // トップページ
  ]
}
```

## エラーハンドリング

1. 未認証エラー
   - ログインページへリダイレクト

2. 権限エラー
   - 非メンバーページで「すずみなふぁみりーメンバーのみアクセス可能」を表示
   - エラートラッキング情報を提供

3. API エラー
   - 適切なステータスコードとエラーメッセージを返却

## 今後の拡張性

1. 追加の認証プロバイダー対応
2. 権限管理の細分化
3. エラートラッキングの強化
4. 本番環境でのPostgreSQLへの移行

## 実装手順

1. NextAuth.js の基本セットアップ
2. Discord OAuth2 の設定
3. Drizzle ORMとデータベーススキーマの設定
4. NextAuth用のDrizzleアダプターの実装
5. エラーページの作成
6. ミドルウェアによるアクセス制御の実装
7. エラーハンドリングの実装

最終更新日: 2025年4月10日
