// functions/src/index.ts
/**
 * Firebase Functionsのエントリーポイントファイル
 *
 * このファイルは各モジュールからCloud Functionsをインポートして
 * まとめてエクスポートする役割を持ちます。
 *
 * Firebase Deploymentsはここからエクスポートされた関数を
 * Firebase Project上にデプロイします。
 */

// HTTPサーバー用の標準モジュール
import * as http from "node:http";
// Cloud Functions 2世代（GCFv2）用のFunctions Frameworkをインポート
// ※実行時依存関係として追加済み
import * as functions from "@google-cloud/functions-framework";
// 適切なロギング
import * as logger from "./utils/logger";

// アプリケーションの初期化状態を管理するフラグ
let initialized = false;

/**
 * アプリケーション初期化関数
 * 
 * この関数は複数回呼び出されても実際の初期化は1回のみ実行される
 */
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

// アプリケーションを初期化
initializeApplication();

// 各モジュールから関数をインポート
import { fetchYouTubeVideos } from "./youtube";

// GCFv2用のCloudEventハンドラーを登録（Pub/Subトリガー関数用）
// 明示的に型情報を指定してCloudEventハンドラーとして登録
functions.cloudEvent<any>("fetchYouTubeVideos", fetchYouTubeVideos);

/**
 * HTTPリクエスト用のハンドラー（ヘルスチェック対応）
 * 
 * このハンドラーはCloudEvent（Pub/Sub）関数とは別に実装されており、
 * シンプルなヘルスチェック応答のみを返します。
 */
functions.http("httpHandler", (req, res) => {
  logger.info("HTTPリクエストを受信しました");
  res.status(200).send("Functions Framework正常動作中");
});

/**
 * メインコード - Cloud Runでの実行時にヘルスチェックに応答するためのサーバー初期化
 *
 * ここではNode.jsの標準HTTPサーバーを使用してCloud Run環境でのヘルスチェックに応答します。
 * Functions Frameworkは自動的に登録された関数をHTTPリクエストにマッピングします。
 */
const PORT = Number.parseInt(process.env.PORT || "8080");

// エントリーポイントとして実行された場合（直接実行された場合）のみサーバーを起動
if (require.main === module) {
  logger.info(`HTTPサーバーをポート${PORT}で起動します...`);

  // FUNCTION_TARGET環境変数を設定（指定がなければデフォルト値を使用）
  // Cloud Run環境では通常これが設定されています
  const functionTarget = process.env.FUNCTION_TARGET || "httpHandler";
  logger.info(`関数ターゲット: ${functionTarget}`);

  // 標準的なHTTPサーバーの作成と必要なリクエストのFunctions Frameworkへの転送
  const server = http.createServer((req, res) => {
    // Functions Frameworkへのリクエストルーティング
    // @ts-expect-error - Functions Framework内部実装へのアクセス
    if (functions._getFunction(functionTarget)) {
      // 登録された関数にリクエストを転送
      // @ts-expect-error - Functions Framework内部実装へのアクセス
      functions._getFunction(functionTarget)(req, res);
    } else {
      // ヘルスチェック用の基本レスポンス
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Functions Framework正常動作中");
    }
  });

  // サーバーを起動し、エラーハンドリングを設定
  server
    .listen(PORT)
    .on("listening", () => {
      logger.info(`HTTPサーバーがポート${PORT}で正常に起動しました`);
    })
    .on("error", (error: Error) => {
      logger.error("HTTPサーバーの起動に失敗しました:", error);
      process.exit(1);
    });
}
