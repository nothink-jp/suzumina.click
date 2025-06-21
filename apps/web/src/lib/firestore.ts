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
  const instance = new Firestore({
    projectId: "suzumina-click",
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
