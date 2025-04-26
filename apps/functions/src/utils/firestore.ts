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
 * Firestoreクライアントのインスタンスを取得
 *
 * @returns Firestoreクライアントのインスタンス
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    // デフォルトの認証情報を使用してFirestoreインスタンスを初期化
    // GCP環境では自動的に適切な認証情報が使用される
    firestoreInstance = new Firestore();
    logger.info("Firestoreクライアントが初期化されました");
  }
  return firestoreInstance;
}

// エクスポート用にFirestoreとTimestampを再エクスポート
// これにより、他のモジュールでのインポートを簡素化
export { Firestore, Timestamp };

// デフォルトのFirestoreインスタンス
// 簡単にアクセスできるようにデフォルトエクスポート
export default getFirestore();
