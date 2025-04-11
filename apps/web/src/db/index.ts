import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts, sessions, users, verificationTokens } from "./schema";

// 環境変数から接続情報を取得
const isLocalDev = process.env.NODE_ENV === "development";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

// PostgreSQLクライアントの設定
const client = postgres(databaseUrl, {
  ssl: !isLocalDev, // 開発環境ではSSLを無効化
  max: 10, // コネクションプールの最大数
  idle_timeout: 20, // アイドルタイムアウト（秒）
  connect_timeout: 10, // 接続タイムアウト（秒）
});

// Drizzle ORMクライアントの初期化
export const db = drizzle(client, {
  schema: { users, accounts, sessions, verificationTokens },
});

export {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "./schema";
