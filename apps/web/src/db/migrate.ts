import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// 環境変数から接続情報を取得
const isLocalDev = process.env.NODE_ENV === "development";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

// マイグレーションの実行
async function main(connectionUrl: string) {
  console.info("Running PostgreSQL migrations...");

  const client = postgres(connectionUrl, {
    ssl: !isLocalDev, // 開発環境ではSSLを無効化
  });

  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.info("Migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed!");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main(databaseUrl);
