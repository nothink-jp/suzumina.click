import type { Config } from "drizzle-kit";

/**
 * 環境設定
 * 
 * 1. ローカル開発環境 (NODE_ENV=development)
 *    - SQLiteを使用
 *    - データベースURL: file:./dev.db
 * 
 * 2. GCP環境 (NODE_ENV=production)
 *    - PostgreSQLを使用
 *    - suzumina-click-dev: 開発環境
 *    - suzumina-click: 本番環境
 *    - データベースURL: postgres://user:password@host:port/database
 * 
 * 詳細は docs/ENVIRONMENTS.md を参照
 */

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
    ssl: !isLocalTest // ローカルテストではSSLを無効化、GCP環境では有効化
  };
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // ローカル開発環境ではSQLite、GCP環境ではPostgreSQLを使用
  dialect: isDevelopment ? "sqlite" : "postgresql",
  dbCredentials: isDevelopment
    ? {
        url: databaseUrl,
      }
    : parsePostgresUrl(databaseUrl),
} satisfies Config;
