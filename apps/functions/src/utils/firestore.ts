/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 *
 * firebase-adminからの依存を排除し、直接@google-cloud/firestoreを使用します。
 * Cloud Run Functions環境での軽量化を実現します。
 */

import { Firestore, Timestamp } from "@google-cloud/firestore";
import * as logger from "./logger";
import { getFirestoreConfig, isEmulatorMode } from "../config";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * Firestoreクライアントのインスタンスを取得
 *
 * @returns Firestoreクライアントのインスタンス
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
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

    // Firestoreインスタンスを初期化
    firestoreInstance = new Firestore(
      Object.keys(options).length > 0 ? options : undefined,
    );
    logger.info("Firestoreクライアントが初期化されました");
  }
  return firestoreInstance;
}

// エクスポート用にFirestoreとTimestampを再エクスポート
// これにより、他のモジュールでのインポートを簡素化
export { Firestore, Timestamp };

// デフォルトエクスポートとしてFirestoreインスタンスを提供
export default getFirestore();
