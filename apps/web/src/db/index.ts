import { drizzle } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
const isLocalTest = process.env.PG_LOCAL_TEST === "true";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

// 開発環境またはビルド時はSQLite、本番環境はPostgreSQLを使用
let db: LibSQLDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

if (isDevelopment || isBuildTime) {
  // SQLite接続
  const client = createClient({
    url: databaseUrl,
  });
  db = drizzle(client, { schema });
} else {
  // PostgreSQL接続
  // ローカルテスト環境ではSSLを無効にする
  const sslEnabled = !isLocalTest;
  const client = postgres(databaseUrl, { ssl: sslEnabled });
  db = drizzlePg(client, { schema });
}

export { db };
export * from "./schema";
