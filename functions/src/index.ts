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

// Cloud Functions 2世代（GCFv2）用のFunctions Frameworkをインポート
// ※実行時依存関係として追加済み
import * as functions from "@google-cloud/functions-framework";
// HTTPサーバー用の標準モジュール
import * as http from "node:http";
// 適切なロギング
import * as logger from "firebase-functions/logger";
// Firebase Admin SDKを初期化するために必要
import { initializeFirebaseAdmin } from "./firebaseAdmin";

// Firebase Admin SDKを初期化
initializeFirebaseAdmin();

// 各モジュールから関数をインポート
import { discordAuthCallback as discordAuthFunc } from "./discordAuth";
import { fetchYouTubeVideos } from "./youtube";

/**
 * Discord認証コールバック関数（GCFv2向けアダプター）
 * Firebase FunctionsのHTTPS関数をGCFv2形式で実行するためのラッパー
 */
functions.http("discordAuthCallback", async (req, res) => {
  try {
    logger.info("GCFv2 discordAuthCallback 関数を呼び出します");
    
    // CORSヘッダーを設定
    const allowedOrigin = "https://suzumina-click-firebase.web.app";
    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");

    // プリフライトリクエストの処理
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // POSTメソッド以外は拒否
    if (req.method !== "POST") {
      logger.error("許可されていないメソッドです（POSTメソッドのみ許可）", {
        method: req.method,
      });
      res.status(405).send("Method Not Allowed");
      return;
    }

    // リクエストボディからcodeを取得
    const code = req.body?.code as string | undefined;
    
    if (!code) {
      logger.error("リクエスト本文に認証コードが見つかりません");
      res.status(400).send({ success: false, error: "Authorization code is required." });
      return;
    }
    
    // Firebase Functionsのコールバックを実行するためのシンプル化されたリクエスト
    const mockRequest = {
      method: "POST",
      body: { code },
      headers: req.headers,
      // 必要に応じて他のプロパティを追加
    };

    // Firebase Functionsの関数を安全に実行
    try {
      // @ts-ignore - 内部実装を直接呼び出し
      const handler = discordAuthFunc._def.func;
      if (typeof handler === 'function') {
        await handler(mockRequest, res);
      } else {
        throw new Error("Discord認証ハンドラーが関数ではありません");
      }
    } catch (error) {
      logger.error("Discord認証処理に失敗しました:", error);
      res.status(500).send({ success: false, error: "Authentication failed." });
    }
  } catch (error) {
    logger.error("Discord認証コールバックの実行中にエラーが発生しました:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// GCFv2用のCloudEventハンドラーを登録（Pub/Subトリガー関数用）
functions.cloudEvent("fetchYouTubeVideos", fetchYouTubeVideos);

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
  const functionTarget = process.env.FUNCTION_TARGET || "discordAuthCallback";
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
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Functions Framework正常動作中');
    }
  });
  
  // サーバーを起動し、エラーハンドリングを設定
  server.listen(PORT)
    .on('listening', () => {
      logger.info(`HTTPサーバーがポート${PORT}で正常に起動しました`);
    })
    .on('error', (error: Error) => {
      logger.error("HTTPサーバーの起動に失敗しました:", error);
      process.exit(1);
    });
}
