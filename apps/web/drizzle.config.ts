import type { Config } from "drizzle-kit";

/**
 * データベース設定
 *
 * 環境構成:
 * 1. ローカル開発環境 (NODE_ENV=development)
 *    - 開発者のPC上のDockerコンテナでPostgreSQLを実行
 *    - SSL無効
 *    - 接続URL例: postgres://suzumina_app:devpassword@localhost:5432/suzumina_db
 *
 * 2. GCP開発環境 (suzumina-click-dev)
 *    - Cloud SQLでPostgreSQLを実行
 *    - SSL有効
 *    - VPCネットワーク経由でアクセス
 *
 * 3. GCP本番環境 (suzumina-click)
 *    - Cloud SQLでPostgreSQLを実行
 *    - SSL有効
 *    - VPCネットワーク経由でアクセス
 *
 * 接続URL形式:
 * postgres://user:password@host:port/database
 *
 * 詳細は docs/auth/POSTGRESQL_DEVELOPMENT_SETUP.md を参照
 */

const isLocalDev = process.env.NODE_ENV === "development";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// PostgreSQL接続情報をURLから解析
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
    ssl: !isLocalDev, // ローカル開発環境ではSSL無効、GCP環境（開発・本番）では有効
  };
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: parsePostgresUrl(databaseUrl),
} satisfies Config;
