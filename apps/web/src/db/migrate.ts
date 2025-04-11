import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// 環境変数から接続情報を取得
const isLocalDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  // skipcq: JS-0263
  process.exit(1);
}

// マイグレーションの実行
async function main(connectionUrl: string) {
  console.info("Running PostgreSQL migrations...");

  const client = postgres(connectionUrl, {
    ssl: !isLocalDev && !isTest, // 開発環境とテスト環境ではSSLを無効化
  });

  const db = drizzle(client);

  try {
    // プロジェクトルートからの相対パスを解決
    const migrationsPath = join(__dirname, "../../drizzle");
    console.info(`Using migrations from: ${migrationsPath}`);

    await migrate(db, { migrationsFolder: migrationsPath });
    console.info("Migrations completed successfully!");
    // skipcq: JS-0263
    process.exit(0);
  } catch (err) {
    console.error("Migration failed!");
    console.error(err);
    // skipcq: JS-0263
    process.exit(1);
  } finally {
    await client.end();
  }
}

main(databaseUrl);
