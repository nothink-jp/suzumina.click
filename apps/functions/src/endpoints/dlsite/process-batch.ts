/**
 * DLsite 統合データ収集: 1バッチ分の実行と集計/ログヘルパ
 *
 * Individual Info API のバッチ呼び出し → 統合処理 → 結果集計までを担う。
 * メタデータ/cursor には触れない（それは collection-metadata.ts / オーケストレータの責務）。
 */

import type { DLsiteApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import type { Timestamp } from "../../infrastructure/database/firestore";
import { batchFetchIndividualInfo } from "../../services/dlsite/individual-info-api-client";
import {
	type ProcessingResult,
	processBatchUnifiedDLsiteData,
} from "../../services/dlsite/unified-data-processor";
import * as logger from "../../shared/logger";

// バッチ処理設定
const MAX_CONCURRENT_API_REQUESTS = 5; // 6 → 3 → 5（バッチ処理を効率化: 50件を10回の並列処理で実行）
const API_REQUEST_DELAY = 400;
export const BATCH_SIZE = 50; // 100 → 50に削減（エラー率低下とタイムアウト回避）
export const MAX_EXECUTION_TIME = 270000; // 4.5分（Cloud Functions 5分タイムアウトより短く設定）

/**
 * 統合処理結果の型定義
 */
export interface UnifiedFetchResult {
	workCount: number;
	apiCallCount: number;
	basicDataUpdated: number;
	error?: string;
	unificationComplete?: boolean;
}

/**
 * バッチ処理情報の型定義
 */
export interface BatchProcessingInfo {
	batchNumber: number;
	totalBatches: number;
	workIds: string[];
	startTime: Timestamp;
	existingWorksMap?: Map<string, WorkDocument>;
	/** SPR-229: 週次フルスイープ時、通常runならstableとしてスキップされていたはずの作品ID（取りこぼし検知用） */
	wouldSkipStableIds?: Set<string>;
}

/**
 * APIレスポンスがない場合のエラーレスポンスを作成
 */
function createNoResponseResult(workIdsLength: number): UnifiedFetchResult {
	return {
		workCount: 0,
		apiCallCount: workIdsLength,
		basicDataUpdated: 0,
		error: "APIレスポンスなし",
	};
}

/**
 * 成功した処理結果をカウント
 */
function countSuccessfulUpdates(result: ProcessingResult) {
	if (!result.success || !result.updates) {
		return { work: 0, circle: 0, creator: 0, priceHistory: 0 };
	}

	return {
		work: result.updates.work ? 1 : 0,
		circle: result.updates.circle ? 1 : 0,
		creator: result.updates.creators ? 1 : 0,
		priceHistory: result.updates.priceHistory ? 1 : 0,
	};
}

/**
 * 処理結果を集計
 */
function aggregateProcessingResults(processingResults: ProcessingResult[]): {
	workUpdated: number;
	circleUpdated: number;
	creatorUpdated: number;
	priceHistoryUpdated: number;
	errors: string[];
} {
	let workUpdated = 0;
	let circleUpdated = 0;
	let creatorUpdated = 0;
	let priceHistoryUpdated = 0;
	const errors: string[] = [];

	for (const result of processingResults) {
		const counts = countSuccessfulUpdates(result);
		workUpdated += counts.work;
		circleUpdated += counts.circle;
		creatorUpdated += counts.creator;
		priceHistoryUpdated += counts.priceHistory;

		if (result.errors?.length > 0) {
			errors.push(...result.errors);
		}
	}

	return {
		workUpdated,
		circleUpdated,
		creatorUpdated,
		priceHistoryUpdated,
		errors,
	};
}

/**
 * バッチ処理結果をUnifiedFetchResult形式に変換
 */
function createBatchResult(
	aggregatedResults: {
		workUpdated: number;
		circleUpdated: number;
		creatorUpdated: number;
		errors: string[];
	},
	workIdsLength: number,
): UnifiedFetchResult {
	return {
		workCount: aggregatedResults.workUpdated,
		apiCallCount: workIdsLength,
		basicDataUpdated: aggregatedResults.workUpdated,
		unificationComplete: aggregatedResults.errors.length === 0,
	};
}

/**
 * API呼び出しの失敗をログ出力
 */
function logApiFailures(batchNumber: number, failedWorkIds: string[]): void {
	if (failedWorkIds.length > 0) {
		logger.warn(`バッチ ${batchNumber}: ${failedWorkIds.length}件の取得失敗`);
		logger.debug(
			`失敗ID一覧: ${failedWorkIds.slice(0, 10).join(", ")}${failedWorkIds.length > 10 ? "..." : ""}`,
		);
	}
}

/**
 * 価格履歴の保存状況をデバッグログ出力
 */
function logPriceHistoryDebug(
	batchNumber: number,
	priceHistoryUpdated: number,
	apiResponses: DLsiteApiResponse[],
	existingWorksMap?: Map<string, WorkDocument>,
): void {
	if (priceHistoryUpdated === 0 && apiResponses.length > 0) {
		logger.warn(`[DEBUG] バッチ ${batchNumber}: 価格履歴が1件も保存されませんでした`);
		logger.warn(`[DEBUG] 現在時刻: ${new Date().toISOString()}`);
		logger.warn(
			`[DEBUG] JST時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
		);
		// 既存作品の状態を確認
		const sampleWorkId = apiResponses[0]?.workno;
		if (sampleWorkId && existingWorksMap) {
			const existingWork = existingWorksMap.get(sampleWorkId);
			logger.warn(
				`[DEBUG] サンプル作品 ${sampleWorkId} の既存データ: ${existingWork ? "あり" : "なし"}`,
			);
		}
	}
}

/**
 * バッチ処理の結果をログ出力
 */
function logBatchComplete(
	batchNumber: number,
	workIdsLength: number,
	apiDataMapSize: number,
	aggregatedResults: ReturnType<typeof aggregateProcessingResults>,
): void {
	logger.info(`バッチ ${batchNumber}: 統合処理完了`, {
		入力: workIdsLength,
		API成功: apiDataMapSize,
		Work更新: aggregatedResults.workUpdated,
		Circle更新: aggregatedResults.circleUpdated,
		Creator更新: aggregatedResults.creatorUpdated,
		価格履歴: aggregatedResults.priceHistoryUpdated,
		エラー数: aggregatedResults.errors.length,
	});
}

/**
 * SPR-229: 週次フルスイープの取りこぼし検知ログ
 *
 * `wouldSkipStableIds`（通常runならstableとしてスキップされていたはずの作品）のうち、
 * 実際にWorkの変化が検出された件数を出す。0件が理想（stableの90日窓が妥当であることの裏付け）。
 * 非0が続く場合はStage③で`VOLATILE_RELEASE_WINDOW_DAYS`の見直しを検討する。
 */
function logFullSweepMissedChanges(
	batchNumber: number,
	processingResults: ProcessingResult[],
	wouldSkipStableIds: Set<string> | undefined,
): void {
	if (!wouldSkipStableIds || wouldSkipStableIds.size === 0) {
		return;
	}

	const targeted = processingResults.filter((r) => wouldSkipStableIds.has(r.workId));
	const missed = targeted.filter((r) => r.updates.work);

	logger.info(`バッチ ${batchNumber}: 週次フルスイープ取りこぼし検知`, {
		stable想定件数: targeted.length,
		変化検出件数: missed.length,
		...(missed.length > 0 && { 変化検出workIds: missed.map((r) => r.workId) }),
	});
}

/**
 * バッチ処理実行
 */
export async function processBatch(batchInfo: BatchProcessingInfo): Promise<UnifiedFetchResult> {
	const { batchNumber, totalBatches, workIds, existingWorksMap, wouldSkipStableIds } = batchInfo;

	logger.info(`バッチ ${batchNumber}/${totalBatches} 処理開始: ${workIds.length}件`);

	try {
		// 1. Individual Info API 呼び出し（バッチ）
		const { results: apiDataMap, failedWorkIds } = await batchFetchIndividualInfo(workIds, {
			maxConcurrent: MAX_CONCURRENT_API_REQUESTS,
			batchDelay: API_REQUEST_DELAY,
		});

		if (apiDataMap.size === 0) {
			logger.warn(`バッチ ${batchNumber}: APIレスポンスなし`);
			return createNoResponseResult(workIds.length);
		}

		// 失敗作品のログ
		logApiFailures(batchNumber, failedWorkIds);

		const apiResponses = Array.from(apiDataMap.values());

		// デバッグ: API取得数とデータ内容を確認
		logger.info(`[DEBUG] バッチ ${batchNumber}: API取得成功数=${apiResponses.length}`);
		if (apiResponses.length > 0 && apiResponses[0]) {
			logger.info(`[DEBUG] サンプルworkno: ${apiResponses[0].workno}`);
		}

		// 2. 新しい統合処理を使用
		const processingResults = await processBatchUnifiedDLsiteData(apiResponses, {
			skipPriceHistory: false, // 価格履歴も含めて全て更新
			forceUpdate: false, // 差分チェックあり
			existingWorksMap, // 既存作品マップを渡す
		});

		// 3. 結果の集計
		const aggregatedResults = aggregateProcessingResults(processingResults);

		// デバッグ: 価格履歴保存の詳細
		logPriceHistoryDebug(
			batchNumber,
			aggregatedResults.priceHistoryUpdated,
			apiResponses,
			existingWorksMap,
		);

		// ログ出力
		logBatchComplete(batchNumber, workIds.length, apiDataMap.size, aggregatedResults);
		logFullSweepMissedChanges(batchNumber, processingResults, wouldSkipStableIds);

		return createBatchResult(aggregatedResults, workIds.length);
	} catch (error) {
		logger.error(`バッチ ${batchNumber} 処理エラー:`, { error });
		return {
			workCount: 0,
			apiCallCount: workIds.length,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}
