import { eq } from "drizzle-orm";
import { db, users } from "../src/db";

/**
 * ユーザーデータ操作のテスト用スクリプト
 *
 * このスクリプトは以下の操作を行います：
 * 1. 既存のユーザーデータを取得
 * 2. ユーザーデータを更新
 * 3. 更新後のユーザーデータを取得
 */
async function main() {
  try {
    console.info("=== ユーザーデータ操作テスト開始 ===");

    // 1. 既存のユーザーデータを取得
    const users_list = await db.query.users.findMany();

    if (users_list.length === 0) {
      console.info("ユーザーが存在しません。テストを終了します。");
      // skipcq: JS-0263
      process.exit(0);
    }

    const user = users_list[0];
    console.info("取得したユーザー:", user);

    // 2. ユーザーデータを更新
    const now = new Date();
    const testNote = `テスト更新: ${now.toISOString()}`;

    console.info(`ユーザー ${user.id} を更新します...`);

    await db
      .update(users)
      .set({
        // displayNameに現在時刻を追加
        displayName: `${user.displayName} (${testNote})`,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    console.info("ユーザーデータを更新しました");

    // 3. 更新後のユーザーデータを取得
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    console.info("更新後のユーザー:", updatedUser);

    // 4. 元に戻す
    await db
      .update(users)
      .set({
        displayName: user.displayName,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    console.info("ユーザーデータを元に戻しました");

    // 5. 元に戻した後のユーザーデータを取得
    const restoredUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    console.info("元に戻した後のユーザー:", restoredUser);

    console.info("=== ユーザーデータ操作テスト完了 ===");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    // skipcq: JS-0263
    process.exit(1);
  }

  // skipcq: JS-0263
  process.exit(0);
}

main();
