"use server";

import { cookies } from "next/headers";
import { initializeFirebaseAdmin } from "./firebase-admin";

/**
 * サーバーサイドでの現在のユーザー情報取得関数
 *
 * Firebase Admin SDKを使用して、現在のユーザー情報を取得します。
 * セッションクッキーからユーザーIDを取得し、Firebase Authからユーザー情報を取得します。
 *
 * @returns ユーザー情報またはnull（未ログイン時）
 */
export async function getCurrentUser() {
  try {
    // Firebase Admin SDKを初期化
    const auth = initializeFirebaseAdmin();

    // セッションクッキーからユーザーIDを取得
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("firebase-session");

    if (!sessionCookie?.value) {
      // セッションクッキーがない場合は未ログイン
      return null;
    }

    try {
      // セッションクッキーを検証してユーザーIDを取得
      const decodedClaims = await auth.verifySessionCookie(
        sessionCookie.value,
        true,
      );
      const uid = decodedClaims.uid;

      if (!uid) {
        return null;
      }

      // ユーザー情報を取得
      const userRecord = await auth.getUser(uid);
      return userRecord;
    } catch (error) {
      console.error("セッションクッキーの検証に失敗しました:", error);
      return null;
    }
  } catch (error) {
    console.error("ユーザー情報の取得に失敗しました:", error);
    return null;
  }
}
