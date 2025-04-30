"use server";

/**
 * Firebase IDトークンからセッションクッキーを生成するAPI
 *
 * クライアント側で取得したIDトークンを検証し、サーバー側でセッションクッキーを生成します
 */
import { cookies } from "next/headers";
import { initializeFirebaseAdmin } from "./firebase-admin";

/**
 * IDトークンからセッションクッキーを生成する
 *
 * @param idToken - クライアントで取得したFirebase IDトークン
 * @returns 処理結果（成功: true, 失敗: false）
 */
export async function createSessionCookie(idToken: string): Promise<boolean> {
  try {
    const auth = initializeFirebaseAdmin();

    // トークンの有効期間 (2週間)
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // ミリ秒単位

    // IDトークンを検証して、長期間有効なセッションクッキーを作成
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    // クッキーを設定
    const cookieStore = await cookies();
    cookieStore.set("firebase-session", sessionCookie, {
      maxAge: expiresIn / 1000, // 秒単位に変換
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 本番環境では Secure 属性を有効化
      path: "/",
      sameSite: "lax",
    });

    console.log("セッションクッキーが正常に作成されました");
    return true;
  } catch (error) {
    console.error("セッションクッキーの作成に失敗しました:", error);
    return false;
  }
}
