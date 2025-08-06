/**
 * DLsite 統合データ収集エンドポイント
 *
 * 新しいshared-types構造と薄いマッパーを使用したバージョン
 * レガシーフィールドを段階的に削除
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { CollectionMetadata } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { logUserAgentSummary } from "../infrastructure/management/user-agent-manager";
import { getExistingWorksMap } from "../services/dlsite/dlsite-firestore";
import { batchFetchIndividualInfo } from "../services/dlsite/individual-info-api-client";
import {
	type ProcessingResult,
	processBatchUnifiedDLsiteData,
} from "../services/dlsite/unified-data-processor";
import { collectWorkIdsForProduction } from "../services/dlsite/work-id-collector";
import { chunkArray } from "../shared/array-utils";
import * as logger from "../shared/logger";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// バッチ処理設定
const MAX_CONCURRENT_API_REQUESTS = 5; // 6 → 3 → 5（バッチ処理を効率化: 50件を10回の並列処理で実行）
const API_REQUEST_DELAY = 400;
const BATCH_SIZE = 50; // 100 → 50に削減（エラー率低下とタイムアウト回避）
const MAX_EXECUTION_TIME = 420000; // 7分

// Note: CollectionMetadata type is now imported from @suzumina.click/shared-types

/**
 * 統合処理結果の型定義
 */
interface UnifiedFetchResult {
	workCount: number;
	apiCallCount: number;
	basicDataUpdated: number;
	error?: string;
	unificationComplete?: boolean;
}

/**
 * バッチ処理情報の型定義
 */
interface BatchProcessingInfo {
	batchNumber: number;
	totalBatches: number;
	workIds: string[];
	startTime: Timestamp;
}

/**
 * 統合データ収集メタデータの取得または初期化
 */
async function getOrCreateUnifiedMetadata(): Promise<CollectionMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as CollectionMetadata;
	}

	const initialMetadata: CollectionMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		unifiedSystemStarted: Timestamp.now(),
		migrationVersion: "v2",
	};

	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * 統合データ収集メタデータの更新
 */
async function updateUnifiedMetadata(update: Partial<CollectionMetadata>): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	await metadataRef.update(update);
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
 * バッチ処理実行
 */
async function processBatch(batchInfo: BatchProcessingInfo): Promise<UnifiedFetchResult> {
	const { batchNumber, totalBatches, workIds } = batchInfo;

	logger.info(`バッチ ${batchNumber}/${totalBatches} 処理開始: ${workIds.length}件`);

	const results = {
		basicDataUpdated: 0,
		priceHistorySaved: 0,
		circleCreatorUpdated: 0,
		errors: [] as string[],
	};

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
		if (failedWorkIds.length > 0) {
			logger.warn(`バッチ ${batchNumber}: ${failedWorkIds.length}件の取得失敗`);
			logger.debug(
				`失敗ID一覧: ${failedWorkIds.slice(0, 10).join(", ")}${failedWorkIds.length > 10 ? "..." : ""}`,
			);
		}

		const apiResponses = Array.from(apiDataMap.values());

		// デバッグ: API取得数とデータ内容を確認
		logger.info(`[DEBUG] バッチ ${batchNumber}: API取得成功数=${apiResponses.length}`);
		if (apiResponses.length > 0) {
			const sampleWork = apiResponses[0];
			if (sampleWork) {
				logger.info(`[DEBUG] サンプルworkno: ${sampleWork.workno}`);
			}
		}

		// 2. 新しい統合処理を使用
		const processingResults = await processBatchUnifiedDLsiteData(apiResponses, {
			skipPriceHistory: false, // 価格履歴も含めて全て更新
			forceUpdate: false, // 差分チェックあり
		});

		// 3. 結果の集計
		const aggregatedResults = aggregateProcessingResults(processingResults);

		results.basicDataUpdated = aggregatedResults.workUpdated;
		results.circleCreatorUpdated = Math.max(
			aggregatedResults.circleUpdated,
			aggregatedResults.creatorUpdated,
		);
		results.priceHistorySaved = aggregatedResults.priceHistoryUpdated;
		results.errors = aggregatedResults.errors;

		// デバッグ: 価格履歴保存の詳細
		if (aggregatedResults.priceHistoryUpdated === 0 && apiResponses.length > 0) {
			logger.warn(`[DEBUG] バッチ ${batchNumber}: 価格履歴が1件も保存されませんでした`);
			logger.warn(`[DEBUG] 現在時刻: ${new Date().toISOString()}`);
			logger.warn(
				`[DEBUG] JST時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
			);
		}

		// ログ出力
		logger.info(`バッチ ${batchNumber}: 統合処理完了`, {
			入力: workIds.length,
			API成功: apiDataMap.size,
			Work更新: aggregatedResults.workUpdated,
			Circle更新: aggregatedResults.circleUpdated,
			Creator更新: aggregatedResults.creatorUpdated,
			価格履歴: aggregatedResults.priceHistoryUpdated,
			エラー数: results.errors.length,
		});

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

/**
 * バッチ処理の継続情報を取得
 */
function getContinuationInfo(
	metadata: CollectionMetadata,
): { isContinuation: true; allWorkIds: string[]; startBatch: number } | { isContinuation: false } {
	if (
		metadata.batchProcessingMode &&
		metadata.allWorkIds &&
		metadata.currentBatch !== undefined &&
		metadata.totalBatches !== undefined
	) {
		logger.info("バッチ処理を継続します", {
			currentBatch: metadata.currentBatch,
			totalBatches: metadata.totalBatches,
		});

		return {
			isContinuation: true,
			allWorkIds: metadata.allWorkIds,
			startBatch: metadata.currentBatch,
		};
	}

	return { isContinuation: false };
}

/**
 * 作品IDを収集（エラー時はフォールバック）
 */
async function collectWorkIdsWithFallback(): Promise<string[]> {
	try {
		logger.info("作品ID収集を開始します...");
		const workIds = await collectWorkIdsForProduction();
		logger.info(`作品ID収集完了: ${workIds.length}件`);
		return workIds;
	} catch (error) {
		logger.error("作品ID収集エラー:", {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.name : "Unknown",
		});

		// エラー時はアセットファイルから読み込み
		try {
			const { readFileSync } = await import("node:fs");
			const { join } = await import("node:path");
			const assetPath = join(__dirname, "../assets/dlsite-work-ids.json");
			const data = JSON.parse(readFileSync(assetPath, "utf-8"));
			const workIds = data.workIds || [];
			logger.warn(`アセットファイルから${workIds.length}件の作品IDを読み込みました`);
			return workIds;
		} catch (assetError) {
			logger.error("アセットファイル読み込みエラー:", assetError);
			return [];
		}
	}
}

/**
 * 新規バッチ処理を初期化
 */
async function initializeNewBatchProcessing(
	allWorkIds: string[],
	batches: string[][],
): Promise<void> {
	logger.info(
		`新規バッチ処理開始: 総作品数=${allWorkIds.length}, バッチ数=${batches.length}, バッチサイズ=${BATCH_SIZE}`,
	);
	logger.info(
		`処理時間制限: ${MAX_EXECUTION_TIME / 1000}秒, 予想処理時間: ${batches.length * 30}秒（30秒/バッチ）`,
	);

	await updateUnifiedMetadata({
		isInProgress: true,
		batchProcessingMode: true,
		allWorkIds,
		totalBatches: batches.length,
		currentBatch: 0,
		totalWorks: allWorkIds.length,
		processedWorks: 0,
		basicDataUpdated: 0,
		completedBatches: [],
		lastError: undefined,
		currentBatchStartTime: Timestamp.now(),
		migrationVersion: "v2",
	});
}

/**
 * バッチループ処理を実行
 */
async function executeBatchLoop(
	batches: string[][],
	startBatch: number,
	startTime: number,
	metadata: CollectionMetadata,
): Promise<{
	totalUpdated: number;
	totalApiCalls: number;
	completedBatches: number[];
}> {
	let totalUpdated = 0;
	let totalApiCalls = 0;
	const completedBatches = metadata.completedBatches || [];

	for (let i = startBatch; i < batches.length; i++) {
		// 実行時間チェック
		if (Date.now() - startTime > MAX_EXECUTION_TIME) {
			logger.info(`実行時間制限に達しました。バッチ ${i}/${batches.length} で中断`);

			await updateUnifiedMetadata({
				currentBatch: i,
				processedWorks: i * BATCH_SIZE,
				basicDataUpdated: (metadata.basicDataUpdated || 0) + totalUpdated,
				lastError: "実行時間制限により中断",
			});
			break;
		}

		// バッチ処理実行
		const batchInfo: BatchProcessingInfo = {
			batchNumber: i + 1,
			totalBatches: batches.length,
			workIds: batches[i] || [],
			startTime: Timestamp.now(),
		};

		const result = await processBatch(batchInfo);
		totalUpdated += result.basicDataUpdated;
		totalApiCalls += result.apiCallCount;
		completedBatches.push(i);

		// メタデータ更新
		await updateUnifiedMetadata({
			currentBatch: i + 1,
			processedWorks: (i + 1) * BATCH_SIZE,
			basicDataUpdated: (metadata.basicDataUpdated || 0) + totalUpdated,
			completedBatches,
			lastError: result.error,
			currentBatchStartTime: Timestamp.now(),
		});

		// バッチ間の遅延
		if (i < batches.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	return { totalUpdated, totalApiCalls, completedBatches };
}

/**
 * 処理完了時のメタデータ更新
 */
async function finalizeCompletedProcessing(
	allWorkIds: string[],
	totalUpdated: number,
): Promise<void> {
	logger.info("全バッチ処理完了", {
		totalWorks: allWorkIds.length,
		totalUpdated,
	});

	await updateUnifiedMetadata({
		isInProgress: false,
		lastSuccessfulCompleteFetch: Timestamp.now(),
		lastFetchedAt: Timestamp.now(),
		batchProcessingMode: false,
		currentBatch: undefined,
		totalBatches: undefined,
		allWorkIds: undefined,
		completedBatches: undefined,
	});
}

/**
 * 統合データ収集処理の実行
 */
async function executeUnifiedDataCollection(): Promise<UnifiedFetchResult> {
	const startTime = Date.now();

	try {
		// メタデータから処理状態を確認
		const metadata = await getOrCreateUnifiedMetadata();
		const continuationInfo = getContinuationInfo(metadata);

		let allWorkIds: string[];
		let batches: string[][];
		let startBatch = 0;

		if (continuationInfo.isContinuation) {
			// 継続処理
			allWorkIds = continuationInfo.allWorkIds;
			batches = chunkArray(allWorkIds, BATCH_SIZE);
			startBatch = continuationInfo.startBatch;
		} else {
			// 新規処理
			allWorkIds = await collectWorkIdsWithFallback();

			if (allWorkIds.length === 0) {
				logger.error("収集対象の作品IDが見つかりません");
				return {
					workCount: 0,
					apiCallCount: 0,
					basicDataUpdated: 0,
					error: "収集対象の作品IDが見つかりません",
				};
			}

			batches = chunkArray(allWorkIds, BATCH_SIZE);
			await initializeNewBatchProcessing(allWorkIds, batches);
		}

		// 既存データの取得
		await getExistingWorksMap(allWorkIds);

		// バッチ処理の実行
		const { totalUpdated, totalApiCalls, completedBatches } = await executeBatchLoop(
			batches,
			startBatch,
			startTime,
			metadata,
		);

		// 処理完了チェック
		const allBatchesCompleted = completedBatches.length === batches.length;

		if (allBatchesCompleted) {
			await finalizeCompletedProcessing(allWorkIds, totalUpdated);
		}

		logUserAgentSummary();

		return {
			workCount: totalUpdated,
			apiCallCount: totalApiCalls,
			basicDataUpdated: totalUpdated,
			unificationComplete: allBatchesCompleted,
		};
	} catch (error) {
		logger.error("統合データ収集エラー:", error);

		await updateUnifiedMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "不明なエラー",
			lastFetchedAt: Timestamp.now(),
		});

		return {
			workCount: 0,
			apiCallCount: 0,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * Cloud Functions エントリーポイント
 */
export async function fetchDLsiteUnifiedData(event: CloudEvent<unknown>): Promise<void> {
	// デバッグ: 関数実行開始をログ出力
	console.log(`[DEBUG] fetchDLsiteUnifiedData開始: ${new Date().toISOString()}`);
	logger.info("統合データ収集開始", {
		eventType: event.type,
		timestamp: new Date().toISOString(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});

	try {
		const result = await executeUnifiedDataCollection();

		if (result.error) {
			logger.error(`統合データ収集エラー: ${result.error}`);
		} else {
			logger.info("統合データ収集完了", {
				更新作品数: result.basicDataUpdated,
				API呼び出し数: result.apiCallCount,
				統合完了: result.unificationComplete,
			});
		}
	} catch (error) {
		logger.error("予期しないエラー:", error);

		await updateUnifiedMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "不明なエラー",
			lastFetchedAt: Timestamp.now(),
		});
	}
}
