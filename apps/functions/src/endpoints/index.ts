// functions/src/index.ts
/**
 * Cloud Functionsのエントリーポイントファイル
 *
 * このファイルは各モジュールからCloud Functionsをインポートして
 * まとめてエクスポートする役割を持ちます。
 */

// Cloud Functions 2世代（GCFv2）用のFunctions Frameworkをインポート
import * as functions from "@google-cloud/functions-framework";
// 適切なロギング
import * as logger from "../shared/logger";
// 各モジュールから関数をインポート（統合アーキテクチャ）
import { fetchDLsiteUnifiedData } from "./dlsite-individual-info-api";
// Phase 3: 通知システム
import { supplementNotification, weeklyHealthReport } from "./supplement-notification";
// collectDLsiteTimeseries は統合アーキテクチャにより fetchDLsiteWorksIndividualAPI に統合
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
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

// 統合アーキテクチャによる Cloud Functions 登録
functions.cloudEvent<PubsubMessage>("fetchYouTubeVideos", fetchYouTubeVideos);
functions.cloudEvent<PubsubMessage>("fetchDLsiteUnifiedData", fetchDLsiteUnifiedData);
// collectDLsiteTimeseries は統合アーキテクチャにより廃止

// Phase 3: 通知システム (失敗率監視削除済み)

// HTTPトリガー関数（通知システム）
functions.http("supplementNotification", supplementNotification);
functions.http("weeklyHealthReport", weeklyHealthReport);

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
		logger.warn(`プロセス終了が要求されました（コード: ${code}）- テスト環境では無視されます`);
		return;
	}

	process.exit(code);
}
