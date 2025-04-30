"use server";

/**
 * セッションクッキーを失効させるAPI
 *
 * ログアウト時にサーバー側でセッションクッキーを削除します
 */
import { cookies } from "next/headers";

/**
 * セッションクッキーを失効させる
 *
 * @returns 処理結果（成功: true）
 */
export async function revokeSession(): Promise<boolean> {
  try {
    // firebase-sessionクッキーを削除
    const cookieStore = await cookies();
    cookieStore.delete("firebase-session");
    return true;
  } catch (error) {
    console.error("セッションクッキーの削除に失敗しました:", error);
    return false;
  }
}
