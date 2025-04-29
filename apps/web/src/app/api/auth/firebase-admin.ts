/**
 * Firebase Admin SDK初期化モジュール
 *
 * Server Actionsで使用するFirebase Admin SDKの初期化を行う
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDKの初期化状態を管理するフラグ
 * 複数回の初期化を防ぐために使用
 */
let initialized = false;

/**
 * Firebase Admin SDKを初期化する関数
 *
 * この関数は複数回呼び出されても実際の初期化は1回のみ実行される
 * Server Actionsの実行ごとに初期化されないようにキャッシュする
 *
 * @returns Firebase Auth管理インスタンス
 */
export function initializeFirebaseAdmin() {
  if (getApps().length === 0 && !initialized) {
    try {
      // 環境変数からサービスアカウントの認証情報を取得
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccountStr) {
        console.error(
          "FIREBASE_SERVICE_ACCOUNT_KEY環境変数が設定されていません。エミュレーターモードを確認します。",
        );

        // 開発環境（エミュレーター）の場合はプロジェクトIDだけでも初期化を試みる
        if (
          process.env.NODE_ENV === "development" ||
          process.env.FIREBASE_AUTH_EMULATOR_HOST
        ) {
          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
          if (!projectId) {
            throw new Error(
              "NEXT_PUBLIC_FIREBASE_PROJECT_ID環境変数が設定されていません",
            );
          }

          // エミュレーター用の初期化（認証情報なし）
          initializeApp({
            projectId: projectId,
          });

          console.log(
            "Firebase Admin SDKがエミュレーターモードで初期化されました",
          );
          initialized = true;
          return getAuth();
        }

        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT_KEY環境変数が設定されていません",
        );
      }

      try {
        // JSON文字列をパース
        const serviceAccount = JSON.parse(serviceAccountStr);

        // Firebase Admin SDKを初期化
        initializeApp({
          credential: cert(serviceAccount),
        });

        initialized = true;
        console.log("Firebase Admin SDKが初期化されました");
      } catch (parseError) {
        console.error(
          "サービスアカウントJSONのパースに失敗しました:",
          parseError,
        );
        throw new Error(
          `サービスアカウントJSONのパースに失敗しました: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
        );
      }
    } catch (error) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", error);
      // 初期化フラグをリセットして次回も初期化を試みられるようにする
      initialized = false;
      throw error;
    }
  }

  return getAuth();
}
