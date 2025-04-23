/**
 * Firebase Admin SDK初期化モジュール
 * 
 * Server Actionsで使用するFirebase Admin SDKの初期化を行う
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
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
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY環境変数が設定されていません");
      }
      
      // JSON文字列をパース
      const serviceAccount = JSON.parse(serviceAccountStr);
      
      // Firebase Admin SDKを初期化
      initializeApp({
        credential: cert(serviceAccount)
      });
      
      initialized = true;
      console.log("Firebase Admin SDKが初期化されました");
    } catch (error) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", error);
      throw error;
    }
  }
  
  return getAuth();
}