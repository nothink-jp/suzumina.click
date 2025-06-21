/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 */

import { Firestore } from "@google-cloud/firestore";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * 新しいFirestoreインスタンスを作成
 */
export function createFirestoreInstance(): Firestore {
  // 環境変数からプロジェクトIDを取得、フォールバックとして'suzumina-click'を使用
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";

  const instance = new Firestore({
    projectId,
    ignoreUndefinedProperties: true,
  });
  return instance;
}

/**
 * Firestoreクライアントのインスタンスを取得
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = createFirestoreInstance();
  }
  return firestoreInstance;
}
