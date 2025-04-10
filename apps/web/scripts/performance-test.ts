import { eq } from "drizzle-orm";
import { db, users } from "../src/db";

/**
 * パフォーマンス検証用スクリプト
 *
 * このスクリプトは以下の操作のパフォーマンスを測定します：
 * 1. 単一ユーザーの取得
 * 2. 全ユーザーの取得
 * 3. ユーザーデータの更新
 * 4. 複数回の連続操作
 */

// 実行時間を測定するユーティリティ関数
async function measureExecutionTime<T>(
  name: string,
  fn: () => Promise<T>,
  iterations = 1,
): Promise<T> {
  console.info(`[${name}] 開始...`);
  const start = performance.now();

  let result: T | undefined;
  for (let i = 0; i < iterations; i++) {
    result = await fn();
  }

  const end = performance.now();
  const duration = end - start;
  const avgDuration = duration / iterations;

  console.info(
    `[${name}] 完了: ${duration.toFixed(2)}ms (${iterations}回実行, 平均: ${avgDuration.toFixed(2)}ms)`,
  );

  // result は少なくとも1回は設定されるため、undefined ではないはず
  return result as T;
}

async function main() {
  try {
    console.info("=== パフォーマンス検証開始 ===");

    // 1. 単一ユーザーの取得
    const users_list = await db.query.users.findMany();

    if (users_list.length === 0) {
      console.error("ユーザーが存在しません。テストを終了します。");
      process.exit(1);
    }

    const userId = users_list[0].id;

    // 単一ユーザーの取得（10回）
    await measureExecutionTime(
      "単一ユーザーの取得",
      async () => {
        return await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
      },
      10,
    );

    // 2. 全ユーザーの取得（10回）
    await measureExecutionTime(
      "全ユーザーの取得",
      async () => {
        return await db.query.users.findMany();
      },
      10,
    );

    // 3. ユーザーデータの更新（10回）
    let counter = 0;
    await measureExecutionTime(
      "ユーザーデータの更新",
      async () => {
        const now = new Date();
        counter++;
        await db
          .update(users)
          .set({
            updatedAt: now,
          })
          .where(eq(users.id, userId));
        return { success: true, counter };
      },
      10,
    );

    // 4. 複数の連続操作（取得→更新→再取得）（10回）
    await measureExecutionTime(
      "複数の連続操作（取得→更新→再取得）",
      async () => {
        // 取得
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) {
          throw new Error("ユーザーが見つかりません");
        }

        // 更新
        const now = new Date();
        await db
          .update(users)
          .set({
            updatedAt: now,
          })
          .where(eq(users.id, userId));

        // 再取得
        return await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
      },
      10,
    );

    // 5. 同時実行テスト（10並列リクエスト）
    console.info("[同時実行テスト] 開始...");
    const start = performance.now();

    const promises = Array(10)
      .fill(0)
      .map(async () => {
        // 各リクエストは取得→更新→再取得の流れ
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) {
          throw new Error("ユーザーが見つかりません");
        }

        const now = new Date();
        await db
          .update(users)
          .set({
            updatedAt: now,
          })
          .where(eq(users.id, userId));

        return await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
      });

    await Promise.all(promises);

    const end = performance.now();
    const duration = end - start;
    console.info(
      `[同時実行テスト] 完了: ${duration.toFixed(2)}ms (10並列リクエスト, 平均: ${(duration / 10).toFixed(2)}ms/リクエスト)`,
    );

    console.info("=== パフォーマンス検証完了 ===");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
