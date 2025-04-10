import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// マイグレーションの実行
async function main() {
  const client = createClient({
    url: "file:./dev.db", // .env.localに合わせてdev.dbに変更
  });

  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" }); // パスを修正

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
