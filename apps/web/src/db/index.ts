import { getRequiredEnvVar, isProductionRuntime } from "@/auth/utils";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts, sessions, users, verificationTokens } from "./schema";

// スキーマの型定義
type Schema = {
  users: typeof users;
  accounts: typeof accounts;
  sessions: typeof sessions;
  verificationTokens: typeof verificationTokens;
};

// DBクライアントの型定義
type DbClient = PostgresJsDatabase<Schema>;

// データベースクライアントの初期化を遅延させる
let _db: DbClient | null = null;

function initDb(): DbClient {
  const isLocalDev = process.env.NODE_ENV === "development";
  const databaseUrl = getRequiredEnvVar("DATABASE_URL");

  // PostgreSQLクライアントの設定
  const client = postgres(databaseUrl, {
    ssl: !isLocalDev, // 開発環境ではSSLを無効化
    max: 10, // コネクションプールの最大数
    idle_timeout: 20, // アイドルタイムアウト（秒）
    connect_timeout: 10, // 接続タイムアウト（秒）
  });

  // Drizzle ORMクライアントの初期化
  return drizzle(client, {
    schema: { users, accounts, sessions, verificationTokens },
  });
}

// データベースクライアントの遅延初期化
export function getDb(): DbClient {
  if (!isProductionRuntime()) {
    // ビルド時はダミークライアントを返す
    const emptyClient = postgres("");
    const dummyDb = drizzle(emptyClient, {
      schema: { users, accounts, sessions, verificationTokens },
    });

    // すべてのメソッドをオーバーライドして空の結果を返す
    return new Proxy(dummyDb, {
      get(target, prop) {
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return undefined;
        }
        const originalValue = target[prop as keyof typeof target];
        if (typeof originalValue === "function") {
          return async () => [];
        }
        return originalValue;
      },
    }) as DbClient;
  }

  if (!_db) {
    _db = initDb();
  }
  return _db;
}

// db のエクスポートを getDb() に変更
export const db = getDb();

export {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "./schema";
