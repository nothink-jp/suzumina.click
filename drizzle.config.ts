import type { Config } from "drizzle-kit";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const isLocalTest = process.env.PG_LOCAL_TEST === "true";
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

// PostgreSQL接続情報をURLから解析する関数
function parsePostgresUrl(url: string) {
  const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error("Invalid PostgreSQL URL format");
  }
  
  const [, user, password, host, port, database] = match;
  
  return {
    host,
    port: Number.parseInt(port, 10),
    user,
    password,
    database,
    ssl: !isLocalTest // ローカルテスト環境ではSSLを無効にする
  };
}

export default {
  schema: "./apps/web/src/db/schema.ts",
  out: "./apps/web/drizzle",
  dialect: isDevelopment ? "sqlite" : "postgresql",
  dbCredentials: isDevelopment
    ? {
        url: databaseUrl,
      }
    : parsePostgresUrl(databaseUrl),
} satisfies Config;
