/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 *
 * firebase-adminからの依存を排除し、直接@google-cloud/firestoreを使用します。
 * Cloud Run Functions環境での軽量化を実現します。
 */

import { Firestore, Timestamp } from "@google-cloud/firestore";
import * as logger from "./logger";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * 新しいFirestoreインスタンスを作成
 *
 * @returns 新しく作成されたFirestoreインスタンス
 */
export function createFirestoreInstance(): Firestore {
  const instance = new Firestore({
    // undefined値を無視するオプションを有効化
    ignoreUndefinedProperties: true,
  });
  logger.info("Firestoreクライアントが初期化されました");
  return instance;
}

/**
 * Firestoreクライアントのインスタンスを取得
 *
 * @returns Firestoreクライアントのインスタンス
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = createFirestoreInstance();
  }
  return firestoreInstance;
}

/**
 * テスト用にFirestoreインスタンスをリセット
 * テストでのみ使用し、本番コードでは使用しないでください
 */
export function resetFirestoreInstance(): void {
  firestoreInstance = null;
}

// エクスポート用にFirestoreとTimestampを再エクスポート
// これにより、他のモジュールでのインポートを簡素化
export { Firestore, Timestamp };

// デフォルトエクスポートとしてFirestoreインスタンスを提供
export default getFirestore();
