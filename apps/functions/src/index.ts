// functions/src/index.ts
/**
 * Firebase Functionsのエントリーポイントファイル
 *
 * このファイルは各モジュールからCloud Functionsをインポートして
 * まとめてエクスポートする役割を持ちます。
 *
 * Firebase Deploymentsはここからエクスポートされた関数を
 * Firebase Project上にデプロイします。
 *
 * Updated: Deploy-functions workflow test - with proper TypeScript types
 */

// Cloud Functions 2世代（GCFv2）用のFunctions Frameworkをインポート
import * as functions from "@google-cloud/functions-framework";
// 各モジュールから関数をインポート
import { fetchDLsiteWorks } from "./dlsite";
// 適切なロギング
import * as logger from "./utils/logger";
import { fetchYouTubeVideos } from "./youtube";

/**
 * アプリケーション初期化関数
 *
 * この関数は複数回呼び出されても実際の初期化は1回のみ実行される
 */
let initialized = false;

export function initializeApplication(): boolean {
  if (!initialized) {
    logger.info("アプリケーション初期化を開始します");

    // 基本的な初期化処理
    // 注意: 個別モジュール固有の初期化は各モジュールで行う

    // 初期化完了
    initialized = true;
    logger.info("アプリケーション初期化が完了しました");
  }
  return true;
}

// アプリケーション初期化を実行
initializeApplication();

// GCFv2用のCloudEventハンドラーを登録（Pub/Subトリガー関数用）
// biome-ignore lint/suspicious/noExplicitAny: Complexity type of cloudEvent
functions.cloudEvent<any>("fetchYouTubeVideos", fetchYouTubeVideos);
// biome-ignore lint/suspicious/noExplicitAny: Complexity type of cloudEvent
functions.cloudEvent<any>("fetchDLsiteWorks", fetchDLsiteWorks);

// ヘルスチェック機能は削除されました
// Cloud Functionsでは不要のため

/**
 * プロセス終了処理
 *
 * テスト環境では実際に終了せず、環境変数チェックを行う
 *
 * @param code 終了コード
 */
export function safeExit(code: number): void {
  // テスト環境では実際に終了しない
  if (process.env.NODE_ENV === "test") {
    logger.warn(
      `プロセス終了が要求されました（コード: ${code}）- テスト環境では無視されます`,
    );
    return;
  }

  process.exit(code);
}
