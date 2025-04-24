/**
 * Cloud Run Functions 用アプリケーション初期化モジュール
 *
 * このモジュールは Cloud Run Functions 環境でのアプリケーション初期化を行います。
 * 以前は firebase-admin に依存していましたが、GCFv2 向けに軽量化しました。
 * 現在は @google-cloud/firestore を直接使用しています。
 */

import * as logger from "./utils/logger";

/**
 * アプリケーションの初期化状態を管理するフラグ
 * 複数回の初期化を防ぐために使用
 */
let initialized = false;

/**
 * アプリケーション初期化関数
 *
 * この関数は複数回呼び出されても実際の初期化は1回のみ実行される
 * 初期化処理はすべて、各モジュールの utils/ 配下にある専用モジュールに移動しました
 * 将来的にこのファイルは削除し、必要な初期化処理を各モジュールに分散させる予定です
 */
export function initializeApplication() {
  if (!initialized) {
    logger.info("アプリケーション初期化を開始します");
    
    // 環境変数のチェックなど、基本的な初期化処理があればここに配置
    if (!process.env.YOUTUBE_API_KEY) {
      logger.warn("環境変数 YOUTUBE_API_KEY が設定されていません");
    }
    
    // 初期化完了
    initialized = true;
    logger.info("アプリケーション初期化が完了しました");
  }
  return true;
}

// モジュール読み込み時に初期化を実行
initializeApplication();
