/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 *
 * firebase-adminからの依存を排除し、直接@google-cloud/firestoreを使用します。
 * Cloud Run Functions環境での軽量化を実現します。
 */

import { Firestore, Timestamp } from "@google-cloud/firestore";
import { getFirestoreConfig, isEmulatorMode } from "../config";
import * as logger from "./logger";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * Firestoreインスタンスを作成するための設定オブジェクトを構築
 *
 * @returns Firestoreコンストラクタに渡すオプション
 */
export function createFirestoreOptions(): Record<string, unknown> | undefined {
  // 設定を取得
  const config = getFirestoreConfig();

  // Firestoreのオプション
  const options: Record<string, unknown> = {};

  // エミュレータモードの場合、接続オプションを追加
  if (isEmulatorMode() && config.useEmulator) {
    options.host = config.host;
    options.port = config.port;
    logger.info(
      `Firestoreエミュレータに接続します: ${config.host}:${config.port}`,
    );
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * 新しいFirestoreインスタンスを作成
 *
 * @returns 新しく作成されたFirestoreインスタンス
 */
export function createFirestoreInstance(): Firestore {
  const options = createFirestoreOptions();
  const instance = new Firestore(options);
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
