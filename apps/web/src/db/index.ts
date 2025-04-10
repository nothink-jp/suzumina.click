import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

// 環境変数のDATABASE_URLを優先的に使用
const sqliteUrl =
  process.env.DATABASE_URL ||
  (isDevelopment || isBuildTime ? "file:./local.db" : undefined);

if (!sqliteUrl) {
  throw new Error("DATABASE_URL is not defined");
}

// SQLiteクライアントの作成
const client = createClient({
  url: sqliteUrl,
});

// Drizzle ORMインスタンスの作成
export const db = drizzle(client, { schema });

// スキーマのエクスポート
export * from "./schema";
