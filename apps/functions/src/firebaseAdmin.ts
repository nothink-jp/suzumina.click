// functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

/**
 * Firebase Admin SDKの初期化状態を管理するフラグ
 * 複数回の初期化を防ぐために使用
 */
let initialized = false;

/**
 * Firebase Admin SDKを初期化する関数
 *
 * この関数は複数回呼び出されても実際の初期化は1回のみ実行される
 * 各Firebaseモジュールの使用前に呼び出すことで、適切な初期化を保証する
 */
export function initializeFirebaseAdmin() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
    console.log("Firebase Admin SDKが初期化されました");
  }
  return admin;
}

// モジュール読み込み時に初期化を実行
initializeFirebaseAdmin();

/**
 * Firestoreインスタンス
 *
 * 初期化済みのFirebase Admin SDKからFirestoreインスタンスを取得
 * プロジェクト内で一貫したFirestoreインスタンスを使用するために提供
 */
export const firestore = admin.firestore();

/**
 * Firebase Auth管理インスタンス
 */
export const auth = admin.auth();
