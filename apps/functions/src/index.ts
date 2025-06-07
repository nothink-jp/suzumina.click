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

import { fetchDLsiteWorks } from "./dlsite";
// 各モジュールから関数をインポート
import { fetchYouTubeVideos } from "./youtube";

// GCFv2用のCloudEventハンドラーを登録（Pub/Subトリガー関数用）
// 明示的に型情報を指定してCloudEventハンドラーとして登録
// biome-ignore lint/suspicious/noExplicitAny: Complexity type of cloudEvent
functions.cloudEvent<any>("fetchYouTubeVideos", fetchYouTubeVideos);
// biome-ignore lint/suspicious/noExplicitAny: Complexity type of cloudEvent
functions.cloudEvent<any>("fetchDLsiteWorks", fetchDLsiteWorks);

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

/**
 * HTTPサーバーの作成と設定
 *
 * @param port サーバーが待機するポート番号
 * @returns 設定済みのHTTPサーバーインスタンス
 */
export function createHttpServer(port: number): http.Server {
  // ログメッセージをテストケースと整合させる
  logger.info(`HTTPサーバーをポート${port}で起動します...`);

  // 標準的なHTTPサーバーの作成と必要なリクエストのFunctions Frameworkへの転送
  const server = http.createServer((req, res) => {
    // Functions Frameworkへのリクエストルーティング
    // @ts-expect-error - Functions Framework内部実装へのアクセス
    const handler = functions._getFunction("httpHandler");
    if (handler) {
      // 登録された関数にリクエストを転送
      handler(req, res);
    } else {
      // ヘルスチェック用の基本レスポンス
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Functions Framework正常動作中");
    }
  });

  // エラーハンドリングを設定
  server.on("error", (error: Error) => {
    logger.error("HTTPサーバーの起動に失敗しました:", error);
    safeExit(1);
  });

  // テスト中にlistenメソッドが呼ばれたことをテストできるように
  // サーバーを起動
  if (process.env.NODE_ENV !== "test") {
    server.listen(port).on("listening", () => {
      logger.info(`HTTPサーバーがポート${port}で正常に起動しました`);
    });
  }

  return server;
}

/**
 * メインコード - Cloud Runでの実行時にヘルスチェックに応答するためのサーバー初期化
 *
 * ここではNode.jsの標準HTTPサーバーを使用してCloud Run環境でのヘルスチェックに応答します。
 * Functions Frameworkは自動的に登録された関数をHTTPリクエストにマッピングします。
 */

// テスト環境でも実行されるようにするため、requireMainチェックを関数に分離
export function runMainModule(): void {
  // アプリケーションを初期化
  initializeApplication();

  // 環境変数からポート設定を取得（デフォルト: 8080）
  const PORT = Number.parseInt(process.env.PORT || "8080");

  // HTTPサーバーを作成
  const server = createHttpServer(PORT);

  // テスト環境ではこの部分は実行されない（上の関数内でリスニング設定済み）
  if (process.env.NODE_ENV !== "test") {
    // リスニングイベントハンドラーを設定（テスト環境では不要）
    server.on("listening", () => {
      logger.info(`HTTPサーバーがポート${PORT}で正常に起動しました`);
    });
  }
}

// メインモジュールとして実行された場合
if (require.main === module) {
  runMainModule();
}
