/**
 * DLsite 統合データ収集エンドポイント
 *
 * 新しいshared-types構造と薄いマッパーを使用したバージョン
 * レガシーフィールドを段階的に削除
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { logUserAgentSummary } from "../infrastructure/management/user-agent-manager";
import { batchCollectCircleAndCreatorInfo } from "../services/dlsite/collect-circle-creator-info";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import { batchFetchIndividualInfo } from "../services/dlsite/individual-info-api-client";
import { collectWorkIdsForProduction } from "../services/dlsite/work-id-collector";
import { WorkMapper } from "../services/mappers/work-mapper";
import { savePriceHistory } from "../services/price-history";
import { chunkArray } from "../shared/array-utils";
import * as logger from "../shared/logger";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// バッチ処理設定
const MAX_CONCURRENT_API_REQUESTS = 3; // 6 → 3に削減（API安定性向上）
const API_REQUEST_DELAY = 400;
const BATCH_SIZE = 50; // 100 → 50に削減（エラー率低下とタイムアウト回避）
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
	// 追加フィールド
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
			return {
				workCount: 0,
				apiCallCount: workIds.length,
				basicDataUpdated: 0,
				error: "APIレスポンスなし",
			};
		}

		// 失敗作品のログ
		if (failedWorkIds.length > 0) {
			logger.warn(`バッチ ${batchNumber}: ${failedWorkIds.length}件の取得失敗`);
			logger.debug(
				`失敗ID一覧: ${failedWorkIds.slice(0, 10).join(", ")}${failedWorkIds.length > 10 ? "..." : ""}`,
			);
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
			logger.info(
				`バッチ ${batchNumber} 詳細: 入力${workIds.length}件 → API成功${apiDataMap.size}件 → 有効データ${validWorkData.length}件 → 保存${results.basicDataUpdated}件`,
			);
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

		// 6. サークル・クリエイター情報収集（batchCollectCircleAndCreatorInfoがサークル更新も行う）
		try {
			const circleCreatorWorkData = validWorkData
				.map((workData) => {
					const matchingApiData = apiResponses.find(
						(apiResponse) => apiResponse.workno === workData.id,
					);
					return {
						workData,
						apiData: matchingApiData || {},
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
 * 統合データ収集処理の実行
 */
async function executeUnifiedDataCollection(): Promise<UnifiedFetchResult> {
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
			logger.info("バッチ処理を継続します", {
				currentBatch: metadata.currentBatch,
				totalBatches: metadata.totalBatches,
			});

			allWorkIds = metadata.allWorkIds;
			batches = chunkArray(allWorkIds, BATCH_SIZE);
			startBatch = metadata.currentBatch;
		} else {
			// 新規処理
			try {
				logger.info("作品ID収集を開始します...");
				allWorkIds = await collectWorkIdsForProduction();
				logger.info(`作品ID収集完了: ${allWorkIds.length}件`);
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
					allWorkIds = data.workIds || [];
					logger.warn(`アセットファイルから${allWorkIds.length}件の作品IDを読み込みました`);
				} catch (assetError) {
					logger.error("アセットファイル読み込みエラー:", assetError);
					allWorkIds = [];
				}
			}

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

			logger.info(
				`新規バッチ処理開始: 総作品数=${allWorkIds.length}, バッチ数=${batches.length}, バッチサイズ=${BATCH_SIZE}`,
			);
			logger.info(
				`処理時間制限: ${MAX_EXECUTION_TIME / 1000}秒, 予想処理時間: ${batches.length * 30}秒（30秒/バッチ）`,
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
		await getExistingWorksMap(allWorkIds);

		// 4. バッチ処理の実行
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

			const batch = batches[i];
			const batchInfo: BatchProcessingInfo = {
				batchNumber: i + 1,
				totalBatches: batches.length,
				workIds: batch || [],
				startTime: Timestamp.now(),
			};

			// バッチ処理実行
			const result = await processBatch(batchInfo);

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
	logger.info("統合データ収集開始", { eventType: event.type });

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
