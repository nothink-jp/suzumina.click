import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate as migrateSqlite } from "drizzle-orm/libsql/migrator";
import postgres from "postgres";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";

// 環境変数から接続情報を取得
const isDevelopment = process.env.NODE_ENV === "development";
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
const isLocalTest = process.env.PG_LOCAL_TEST === "true";
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

// マイグレーションの実行
async function main() {
  if (isDevelopment || isBuildTime) {
    // SQLiteマイグレーション
    console.log("Running SQLite migrations...");
    const client = createClient({
      url: databaseUrl,
    });

    const db = drizzle(client);
    await migrateSqlite(db, { migrationsFolder: "./drizzle" });
  } else {
    // PostgreSQLマイグレーション
    console.log("Running PostgreSQL migrations...");
    // ローカルテスト環境ではSSLを無効にする
    const sslEnabled = !isLocalTest;
    console.log(`SSL is ${sslEnabled ? "enabled" : "disabled"}`);
    
    const client = postgres(databaseUrl, { ssl: sslEnabled });
    const db = drizzlePg(client);
    await migratePg(db, { migrationsFolder: "./drizzle" });
  }

  console.log("Migrations completed successfully!");
  // skipcq: JS-0263
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  // skipcq: JS-0263
  process.exit(1);
});
