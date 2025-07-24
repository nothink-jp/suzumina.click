/**
 * DLsite 統合データ収集エンドポイント V2
 *
 * 新しいshared-types構造と薄いマッパーを使用したバージョン
 * レガシーフィールドを段階的に削除
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { logUserAgentSummary } from "../infrastructure/management/user-agent-manager";
import { batchCollectCircleAndCreatorInfo } from "../services/dlsite/collect-circle-creator-info";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import { batchFetchIndividualInfo } from "../services/dlsite/individual-info-api-client";
import { collectWorkIdsForProduction } from "../services/dlsite/work-id-collector";
import { handleNoWorkIdsError } from "../services/dlsite/work-id-validator";
import { WorkMapper } from "../services/mappers/work-mapper";
import { savePriceHistory } from "../services/price-history";
import { chunkArray } from "../shared/array-utils";
import * as logger from "../shared/logger";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// バッチ処理設定
const MAX_CONCURRENT_API_REQUESTS = 5;
const API_REQUEST_DELAY = 800;
const BATCH_SIZE = 200;
const MAX_EXECUTION_TIME = 420000; // 7分

// 統合データ収集メタデータの型定義
interface UnifiedDataCollectionMetadata {
	lastFetchedAt: Timestamp;
	currentBatch?: number;
	totalBatches?: number;
	currentBatchStartTime?: Timestamp;
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: Timestamp;
	totalWorks?: number;
	processedWorks?: number;
	basicDataUpdated?: number;
	unifiedSystemStarted?: Timestamp;
	batchProcessingMode?: boolean;
	allWorkIds?: string[];
	completedBatches?: number[];
	// V2追加フィールド
	migrationVersion?: string;
}

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
async function getOrCreateUnifiedMetadata(): Promise<UnifiedDataCollectionMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as UnifiedDataCollectionMetadata;
	}

	const initialMetadata: UnifiedDataCollectionMetadata = {
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
async function updateUnifiedMetadata(
	update: Partial<UnifiedDataCollectionMetadata>,
): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	await metadataRef.update(update);
}

/**
 * バッチ処理実行（V2）
 */
async function processBatchV2(
	batchInfo: BatchProcessingInfo,
	existingWorksMap: Map<string, OptimizedFirestoreDLsiteWorkData>,
): Promise<UnifiedFetchResult> {
	const { batchNumber, totalBatches, workIds } = batchInfo;

	logger.info(`[V2] バッチ ${batchNumber}/${totalBatches} 処理開始: ${workIds.length}件`);

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
			return {
				workCount: 0,
				apiCallCount: workIds.length,
				basicDataUpdated: 0,
				error: "APIレスポンスなし",
			};
		}

		// 失敗作品のログ
		if (failedWorkIds.length > 0) {
			logger.warn(`バッチ ${batchNumber}: ${failedWorkIds.length}件の取得失敗`, { failedWorkIds });
		}

		const apiResponses = Array.from(apiDataMap.values());

		// 2. 新しいマッパーでデータ変換
		const validWorkData = apiResponses
			.map((apiData) => WorkMapper.toWork(apiData))
			.filter((work) => work.id && work.title && work.circle);

		if (validWorkData.length === 0) {
			logger.warn(`バッチ ${batchNumber}: 有効な作品データなし`);
			return {
				workCount: 0,
				apiCallCount: workIds.length,
				basicDataUpdated: 0,
				error: "有効な作品データなし",
			};
		}

		// 3. レガシーフィールドの削除は不要（新しいマッパーは最適化済み）
		const processedWorkData = validWorkData;

		// 4. Firestoreに保存
		try {
			await saveWorksToFirestore(processedWorkData);
			results.basicDataUpdated = processedWorkData.length;
			logger.info(`バッチ ${batchNumber}: ${results.basicDataUpdated}件の基本データ更新完了`);
		} catch (error) {
			const errorMsg = `Firestore保存エラー: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(errorMsg);
			results.errors.push(errorMsg);
		}

		// 5. 価格履歴保存（並列処理）
		const priceHistoryPromises = apiResponses.map((apiResponse) =>
			savePriceHistory(apiResponse.workno || "", apiResponse).catch((error) => {
				logger.warn(`価格履歴保存失敗 ${apiResponse.workno}:`, error);
				return null;
			}),
		);

		const priceHistoryResults = await Promise.allSettled(priceHistoryPromises);
		results.priceHistorySaved = priceHistoryResults.filter(
			(result) => result.status === "fulfilled" && result.value,
		).length;

		// 6. サークル・クリエイター情報収集
		try {
			const circleCreatorWorkData = validWorkData
				.map((workData) => {
					const matchingApiData = apiResponses.find(
						(apiResponse) => apiResponse.workno === workData.id,
					);
					return {
						workData,
						apiData: matchingApiData || {},
						isNewWork: !existingWorksMap.has(workData.id),
					};
				})
				.filter((item) => item.apiData.workno);

			if (circleCreatorWorkData.length > 0) {
				const circleCreatorResult = await batchCollectCircleAndCreatorInfo(circleCreatorWorkData);
				results.circleCreatorUpdated = circleCreatorResult.processed;
			}
		} catch (error) {
			const errorMsg = `サークル・クリエイター情報収集エラー: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(errorMsg);
			results.errors.push(errorMsg);
		}

		return {
			workCount: results.basicDataUpdated,
			apiCallCount: workIds.length,
			basicDataUpdated: results.basicDataUpdated,
			unificationComplete: results.errors.length === 0,
		};
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
 * 統合データ収集処理の実行（V2）
 */
async function executeUnifiedDataCollectionV2(): Promise<UnifiedFetchResult> {
	const startTime = Date.now();

	try {
		// 1. メタデータから処理状態を確認
		const metadata = await getOrCreateUnifiedMetadata();

		let allWorkIds: string[];
		let batches: string[][];
		let startBatch = 0;

		// 2. 継続処理かどうかを判定
		if (
			metadata.batchProcessingMode &&
			metadata.allWorkIds &&
			metadata.currentBatch !== undefined &&
			metadata.totalBatches !== undefined
		) {
			// 継続処理
			logger.info("[V2] バッチ処理を継続します", {
				currentBatch: metadata.currentBatch,
				totalBatches: metadata.totalBatches,
			});

			allWorkIds = metadata.allWorkIds;
			batches = chunkArray(allWorkIds, BATCH_SIZE);
			startBatch = metadata.currentBatch;
		} else {
			// 新規処理
			allWorkIds = await collectWorkIdsForProduction();

			if (allWorkIds.length === 0) {
				await handleNoWorkIdsError();
				return {
					workCount: 0,
					apiCallCount: 0,
					basicDataUpdated: 0,
					error: "収集対象の作品IDが見つかりません",
				};
			}

			batches = chunkArray(allWorkIds, BATCH_SIZE);

			logger.info(
				`[V2] 新規バッチ処理開始: 総作品数=${allWorkIds.length}, バッチ数=${batches.length}`,
			);

			// メタデータを初期化
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

		// 3. 既存データの取得
		const existingWorksMap = await getExistingWorksMap(allWorkIds);

		// 4. バッチ処理の実行
		let totalUpdated = 0;
		let totalApiCalls = 0;
		const completedBatches = metadata.completedBatches || [];

		for (let i = startBatch; i < batches.length; i++) {
			// 実行時間チェック
			if (Date.now() - startTime > MAX_EXECUTION_TIME) {
				logger.info(`[V2] 実行時間制限に達しました。バッチ ${i}/${batches.length} で中断`);

				await updateUnifiedMetadata({
					currentBatch: i,
					processedWorks: i * BATCH_SIZE,
					basicDataUpdated: (metadata.basicDataUpdated || 0) + totalUpdated,
					lastError: "実行時間制限により中断",
				});

				break;
			}

			const batch = batches[i];
			const batchInfo: BatchProcessingInfo = {
				batchNumber: i + 1,
				totalBatches: batches.length,
				workIds: batch || [],
				startTime: Timestamp.now(),
			};

			// バッチ処理実行
			const result = await processBatchV2(batchInfo, existingWorksMap);

			totalUpdated += result.basicDataUpdated;
			totalApiCalls += result.apiCallCount;

			// 完了バッチを記録
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

		// 5. 処理完了チェック
		const allBatchesCompleted = completedBatches.length === batches.length;

		if (allBatchesCompleted) {
			logger.info("[V2] 全バッチ処理完了", {
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

		logUserAgentSummary();

		return {
			workCount: totalUpdated,
			apiCallCount: totalApiCalls,
			basicDataUpdated: totalUpdated,
			unificationComplete: allBatchesCompleted,
		};
	} catch (error) {
		logger.error("[V2] 統合データ収集エラー:", error);

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
 * Cloud Functions エントリーポイント (V2)
 */
export async function fetchDLsiteUnifiedDataV2(event: CloudEvent<unknown>): Promise<void> {
	logger.info("[V2] 統合データ収集開始", { eventType: event.type });

	try {
		const result = await executeUnifiedDataCollectionV2();

		if (result.error) {
			logger.error(`[V2] 統合データ収集エラー: ${result.error}`);
		} else {
			logger.info("[V2] 統合データ収集完了", {
				更新作品数: result.basicDataUpdated,
				API呼び出し数: result.apiCallCount,
				統合完了: result.unificationComplete,
			});
		}
	} catch (error) {
		logger.error("[V2] 予期しないエラー:", error);

		await updateUnifiedMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "不明なエラー",
			lastFetchedAt: Timestamp.now(),
		});
	}
}
