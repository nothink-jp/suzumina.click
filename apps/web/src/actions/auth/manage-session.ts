"use server";

/**
 * セッション管理に関するServer Actions
 *
 * セッションの作成、確認、削除などのセッション管理機能を提供します
 */
import { cookies } from "next/headers";

/**
 * セッションクッキーを失効させる
 *
 * @returns 処理結果（成功: true）
 */
export async function revokeSession(): Promise<boolean> {
  try {
    // sessionクッキーを削除
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return true;
  } catch (error) {
    console.error("セッションクッキーの削除に失敗しました:", error);
    return false;
  }
}
