"use server";

import type { UserRecord } from "firebase-admin/auth";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin } from "./firebase-admin";
import { revokeSession } from "./manage-session";

/**
 * APIリクエストからAuthorizationヘッダーのBearerトークンを取得する
 *
 * @param req NextRequestオブジェクト（オプション）
 * @returns Bearerトークン（見つからない場合はnull）
 */
export async function getBearerToken(
  req?: NextRequest,
): Promise<string | null> {
  // リクエストオブジェクトから直接取得（API Routeの場合）
  if (req?.headers) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
  }

  // ヘッダーオブジェクトから取得（Server Actionの場合）
  try {
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
  } catch (error) {
    console.log("ヘッダーの取得に失敗しました:", error);
  }

  return null;
}

/**
 * サーバーサイドでの現在のユーザー情報取得関数
 *
 * Firebase Admin SDKを使用して、現在のユーザー情報を取得します。
 * 1. AuthorizationヘッダーのBearerトークンからユーザー情報を取得
 * 2. セッションクッキーからユーザー情報を取得
 * 上記の順で認証を試みます。
 *
 * @param req NextRequestオブジェクト（オプション）
 * @returns ユーザー情報またはnull（未ログイン時）
 */
export async function getCurrentUser(
  req?: NextRequest,
): Promise<UserRecord | null> {
  try {
    // Firebase Admin SDKを初期化
    const auth = initializeFirebaseAdmin();

    // 1. Bearerトークンからの認証を試みる
    const idToken = await getBearerToken(req);
    if (idToken) {
      try {
        // IDトークンを検証してユーザー情報を取得
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (uid) {
          const userRecord = await auth.getUser(uid);
          console.log("Bearer認証成功:", userRecord.uid);
          return userRecord;
        }
      } catch (error) {
        console.error("IDトークンの検証に失敗しました:", error);
        // トークン認証が失敗した場合はクッキー認証を試みる
      }
    }

    // 2. セッションクッキーからの認証を試みる
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      // セッションクッキーがない場合は未ログイン
      return null;
    }

    try {
      // セッションクッキーを検証してユーザーIDを取得
      const decodedClaims = await auth.verifySessionCookie(
        sessionCookie.value,
        true, // セッションの失効確認を厳格に行う
      );
      const uid = decodedClaims.uid;

      if (!uid) {
        return null;
      }

      // ユーザー情報を取得
      const userRecord = await auth.getUser(uid);

      console.log("セッションクッキー認証成功:", {
        uid: userRecord.uid,
      });

      return userRecord;
    } catch (error) {
      console.error("セッションクッキーの検証に失敗しました:", error);
      // クッキーが無効な場合は削除（revokeSession関数を使用）
      await revokeSession();
      return null;
    }
  } catch (error) {
    console.error("ユーザー情報の取得に失敗しました:", error);
    return null;
  }
}
