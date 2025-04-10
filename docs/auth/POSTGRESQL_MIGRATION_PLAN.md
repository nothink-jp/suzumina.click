# 本番環境PostgreSQL移行計画

## 概要

開発環境ではSQLiteを使用していますが、本番環境ではCloud SQLのPostgreSQLインスタンスに接続するように移行します。この文書では、本番環境でのPostgreSQL対応計画について詳細を記述します。

## 移行の目的と利点

### 目的

1. スケーラビリティの向上
2. 同時接続処理の改善
3. バックアップと復旧機能の強化
4. クラウドネイティブな運用

### 利点

1. **パフォーマンス**: 高負荷時や同時接続が多い場合でも安定したパフォーマンスを提供
2. **信頼性**: トランザクション処理、WAL（Write-Ahead Logging）によるデータ整合性の保証
3. **スケーラビリティ**: ユーザー数の増加に応じたスケールアップが容易
4. **バックアップ**: Cloud SQLの自動バックアップ機能による定期的なデータ保護
5. **監視**: Cloud Monitoringとの統合による詳細な監視

## 開発環境と本番環境の違い

| 項目 | 開発環境 (SQLite) | 本番環境 (PostgreSQL) |
|------|-------------------|----------------------|
| データベースエンジン | SQLite | PostgreSQL |
| 接続方法 | ファイルベース | ネットワーク接続 |
| 接続文字列 | `file:./dev.db` | `postgres://user:password@host:port/database` |
| 同時接続 | 制限あり | 多数の同時接続をサポート |
| トランザクション | 基本的なサポート | 完全なACIDサポート |
| スケーラビリティ | 限定的 | 高い |
| バックアップ | 手動 | 自動 + ポイントインタイムリカバリ |
| セキュリティ | ファイルパーミッション | ユーザー認証、SSL、ネットワークセキュリティ |

## 技術的な実装計画

### 1. PostgreSQL用のスキーマ定義

Drizzle ORMは、SQLiteとPostgreSQLの両方をサポートしています。PostgreSQL用のスキーマを定義するには、以下のように修正します：

```typescript
// apps/web/src/db/schema.ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

// ユーザーテーブル
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  role: text("role").notNull().default("member"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// アカウントテーブル（OAuth連携用）
export const accounts = pgTable("accounts", {
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

// セッションテーブル
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// 検証トークンテーブル
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
});

// リレーションの定義（変更なし）
// ...
```

### 2. データベース接続の設定

環境に応じたデータベース接続を設定するために、`apps/web/src/db/index.ts`を修正します：

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

// 開発環境またはビルド時はSQLite、本番環境はPostgreSQLを使用
let db;
if (isDevelopment || isBuildTime) {
  // SQLite接続
  const client = createClient({
    url: databaseUrl,
  });
  db = drizzle(client, { schema });
} else {
  // PostgreSQL接続
  const client = postgres(databaseUrl, { ssl: true });
  db = drizzlePg(client, { schema });
}

export { db };
export * from "./schema";
```

### 3. マイグレーション設定の更新

`drizzle.config.ts`ファイルを更新して、PostgreSQLマイグレーションをサポートします：

```typescript
import type { Config } from "drizzle-kit";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

export default {
  schema: "./apps/web/src/db/schema.ts",
  out: "./apps/web/drizzle",
  driver: isDevelopment ? "libsql" : "pg",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### 4. 環境変数の設定

本番環境では、以下の環境変数を設定します：

```env
# データベース設定
DATABASE_URL=postgres://user:password@host:port/database
```

Cloud Runでは、Secret Managerを使用して環境変数を安全に管理します。

## デプロイメント計画

### 1. Cloud SQLインスタンスの作成

Terraformを使用してCloud SQLインスタンスを作成します：

```hcl
resource "google_sql_database_instance" "instance" {
  name             = "suzumina-db-instance"
  region           = "asia-northeast1"
  database_version = "POSTGRES_14"
  
  settings {
    tier = "db-f1-micro"  // 開発/テスト用の小さいインスタンス
    
    backup_configuration {
      enabled            = true
      start_time         = "02:00"  // JST 11:00
      point_in_time_recovery_enabled = true
    }
    
    ip_configuration {
      ipv4_enabled        = false
      private_network     = google_compute_network.vpc_network.id
      require_ssl         = true
    }
  }
  
  deletion_protection = true  // 誤削除防止
}

resource "google_sql_database" "database" {
  name     = "suzumina_db"
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "user" {
  name     = "suzumina_app"
  instance = google_sql_database_instance.instance.name
  password = var.db_password  // Secret Managerから取得
}
```

### 2. マイグレーションの実行

本番環境へのデプロイ前に、マイグレーションを実行します：

```bash
# 本番環境用のマイグレーション
DATABASE_URL=$PROD_DATABASE_URL bun run db:migrate
```

### 3. Cloud Runサービスの更新

Cloud Runサービスを更新して、PostgreSQL接続情報を環境変数として設定します：

```hcl
resource "google_cloud_run_service" "web" {
  name     = "suzumina-web"
  location = "asia-northeast1"
  
  template {
    spec {
      containers {
        image = "gcr.io/suzumina-click/web:latest"
        
        env {
          name  = "DATABASE_URL"
          value_from {
            secret_manager_key {
              name    = "database-url"
              version = "latest"
            }
          }
        }
        
        // 他の環境変数...
      }
    }
  }
}
```

## テスト計画

### 1. ローカル環境でのPostgreSQLテスト

開発環境でもPostgreSQLをテストするために、Dockerを使用してローカルPostgreSQLインスタンスを実行します：

```bash
# PostgreSQLコンテナの起動
docker run --name postgres-test -e POSTGRES_PASSWORD=password -e POSTGRES_USER=user -e POSTGRES_DB=test -p 5432:5432 -d postgres:14

# 環境変数の設定
export DATABASE_URL=postgres://user:password@localhost:5432/test

# マイグレーションの実行
bun run db:migrate

# テストの実行
bun test
```

### 2. ステージング環境でのテスト

本番環境と同じ構成のステージング環境でテストを実施します：

1. ステージング用のCloud SQLインスタンスを作成
2. マイグレーションを実行
3. ステージング環境にデプロイ
4. 認証フローのテスト
5. パフォーマンステスト
6. セキュリティテスト

### 3. 本番環境への段階的デプロイ

1. 小規模なユーザーグループに対して新システムをロールアウト
2. モニタリングとフィードバック収集
3. 問題がなければ全ユーザーに展開

## ロールバック計画

問題が発生した場合は、以下の手順でロールバックします：

1. 前のバージョンのCloud Runサービスにロールバック
2. データベース接続をSQLiteに戻す（一時的な措置）
3. 問題の原因を特定して修正

## 監視計画

以下の指標を監視します：

1. **データベース接続数**: 接続プールが適切に管理されているか
2. **クエリパフォーマンス**: 遅いクエリの特定と最適化
3. **エラー率**: データベース関連のエラーの監視
4. **ディスク使用量**: データベースサイズの増加傾向
5. **CPU/メモリ使用率**: リソース使用状況

## タイムライン

1. PostgreSQL用のスキーマとコード修正（2日）
2. ローカル環境でのPostgreSQLテスト（2日）
3. Cloud SQLインスタンスのセットアップ（1日）
4. ステージング環境でのテスト（3日）
5. 本番環境への段階的デプロイ（2日）
6. モニタリングと最適化（継続的）

合計：約10日間

## 結論

PostgreSQLへの移行により、アプリケーションのスケーラビリティ、信頼性、パフォーマンスが向上します。Drizzle ORMを使用することで、SQLiteとPostgreSQLの両方をサポートでき、開発環境と本番環境の違いを最小限に抑えることができます。

最終更新日: 2025年4月10日