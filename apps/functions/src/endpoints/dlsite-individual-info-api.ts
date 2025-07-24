/**
 * DLsite 統合データ収集エンドポイント
 *
 * 100% API-Only アーキテクチャによる統合データ収集システム
 * Individual Info API（254フィールド）による基本データ更新 + 時系列データ収集の統合実行
 * HTMLスクレイピング完全廃止・重複API呼び出し排除による効率化実現
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
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

// バッチ処理設定（統合APIクライアント利用）
const MAX_CONCURRENT_API_REQUESTS = 5; // バッチ処理対応: 並列数を5に設定
const API_REQUEST_DELAY = 800; // バッチ処理対応: 間隔を800msに設定

// バッチ処理設定
const BATCH_SIZE = 200; // 1バッチあたりの作品数（約2-3分で処理）
const MAX_EXECUTION_TIME = 420000; // 7分（420秒）の実行時間制限

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
	// バッチ処理関連
	batchProcessingMode?: boolean;
	allWorkIds?: string[];
	completedBatches?: number[];
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
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
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

// 配列分割ユーティリティは shared/array-utils.ts から import

// 重複実装を削除済み - 統合APIクライアントを使用
// fetchIndividualWorkInfo と batchFetchIndividualInfo は
// services/dlsite/individual-info-api-client.ts に統合されました

/**
 * 統合データ収集メタデータの取得または初期化
 */
async function getOrCreateUnifiedMetadata(): Promise<UnifiedDataCollectionMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as UnifiedDataCollectionMetadata;
	}

	// 初期メタデータの作成
	const initialMetadata: UnifiedDataCollectionMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		currentBatch: 0,
		unifiedSystemStarted: Timestamp.now(),
	};
	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * 統合メタデータの更新
 */
async function updateUnifiedMetadata(
	updates: Partial<UnifiedDataCollectionMetadata>,
): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);

	const sanitizedUpdates: Record<
		string,
		Timestamp | boolean | string | number | string[] | number[] | null
	> = {
		lastFetchedAt: Timestamp.now(),
	};

	for (const [key, value] of Object.entries(updates)) {
		if (key !== "lastFetchedAt") {
			sanitizedUpdates[key] = value === undefined ? null : value;
		}
	}

	await metadataRef.update(sanitizedUpdates);
}

/**
 * 単一バッチの処理
 */
async function processSingleBatch(batchInfo: BatchProcessingInfo): Promise<UnifiedFetchResult> {
	const { batchNumber, workIds } = batchInfo;

	try {
		// 既存データの確認
		const existingWorksMap = await getExistingWorksMap(workIds);

		// Individual Info APIでデータを取得（統合APIクライアント使用）
		const { results: apiDataMap, failedWorkIds } = await batchFetchIndividualInfo(workIds, {
			maxConcurrent: MAX_CONCURRENT_API_REQUESTS,
			batchDelay: API_REQUEST_DELAY,
		});

		if (apiDataMap.size === 0) {
			return {
				workCount: 0,
				apiCallCount: workIds.length,
				basicDataUpdated: 0,
				error: "Individual Info APIからデータを取得できませんでした",
			};
		}

		const apiResponses = Array.from(apiDataMap.values());

		// 統合データ処理: 同一APIレスポンスから並列変換
		const results = {
			basicDataUpdated: 0,
			priceHistorySaved: 0,
			circleCreatorUpdated: 0,
			errors: [] as string[],
		};

		// 基本データ変換・保存処理
		const basicDataProcessing = async () => {
			try {
				const workDataList = apiResponses.map((apiData) => WorkMapper.toWork(apiData));
				const validWorkData = workDataList.filter((work) => {
					// Basic validation - ensure required fields exist
					if (!work.id || !work.title || !work.circle) {
						return false;
					}
					return true;
				});

				if (validWorkData.length > 0) {
					await saveWorksToFirestore(validWorkData);
					results.basicDataUpdated = validWorkData.length;
				}

				// 🆕 価格履歴データ保存（Promise.allSettled で並列実行・エラー耐性）
				const priceHistoryResults = await Promise.allSettled(
					apiResponses
						.filter((apiResponse) => apiResponse.workno) // worknoが存在するもののみ
						.map((apiResponse) => savePriceHistory(apiResponse.workno || "", apiResponse)),
				);

				// 結果集計（失敗のみログ出力）
				let successCount = 0;
				priceHistoryResults.forEach((result) => {
					if (result.status === "fulfilled") {
						if (result.value) {
							successCount++;
						}
					}
				});

				// 価格履歴保存成功件数を記録
				results.priceHistorySaved = successCount;

				// 🆕 サークル・クリエイター情報の収集（バッチ処理）
				try {
					// APIレスポンスと作品データのペアを作成
					const circleCreatorWorkData = validWorkData
						.map((workData) => {
							const matchingApiData = apiResponses.find(
								(apiResponse) => apiResponse.workno === workData.id,
							);
							return {
								workData,
								apiData: matchingApiData || ({} as Record<string, unknown>), // fallback for safety
								isNewWork: !existingWorksMap.has(workData.id),
							};
						})
						.filter((item) => item.apiData.workno); // API データがあるもののみ

					if (circleCreatorWorkData.length > 0) {
						const circleCreatorResult =
							await batchCollectCircleAndCreatorInfo(circleCreatorWorkData);

						results.circleCreatorUpdated = circleCreatorResult.processed;

						if (!circleCreatorResult.success && circleCreatorResult.errors.length > 0) {
							logger.warn(
								`サークル・クリエイター情報収集エラー: ${circleCreatorResult.errors.length}件`,
							);
						}
					}
				} catch (error) {
					const errorMsg = `サークル・クリエイター情報収集エラー: ${error instanceof Error ? error.message : String(error)}`;
					logger.error(errorMsg);
					results.errors.push(errorMsg);
				}

				return validWorkData.length;
			} catch (error) {
				const errorMsg = `バッチ ${batchNumber} 基本データ処理エラー: ${error instanceof Error ? error.message : String(error)}`;
				logger.error(errorMsg);
				results.errors.push(errorMsg);
				return 0;
			}
		};

		// 基本データ処理実行
		await basicDataProcessing();

		// 失敗作品がある場合のみログ出力
		if (failedWorkIds.length > 0) {
			logger.warn(`バッチ ${batchNumber} 失敗: ${failedWorkIds.length}件`);
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
 * 統合データ収集処理の実行（バッチ処理版）
 * 基本データ更新 + 時系列データ収集を同一APIレスポンスから並列実行
 * 現在リージョンで取得可能な作品のみ処理（効率化済み）
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: バッチ処理のため複雑度が高い
async function executeUnifiedDataCollection(): Promise<UnifiedFetchResult> {
	// 統合データ収集システム開始

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
			metadata.currentBatch !== undefined
		) {
			// 継続処理の場合
			allWorkIds = metadata.allWorkIds;
			batches = chunkArray(allWorkIds, BATCH_SIZE);
			startBatch = metadata.currentBatch;
		} else {
			// 新規処理の場合
			// 現在のリージョンで作品IDを取得
			allWorkIds = await collectWorkIdsForProduction();

			if (allWorkIds.length === 0) {
				handleNoWorkIdsError();
				return {
					workCount: 0,
					apiCallCount: 0,
					basicDataUpdated: 0,
					error: "作品IDが取得できませんでした",
				};
			}

			// バッチに分割
			batches = chunkArray(allWorkIds, BATCH_SIZE);

			// メタデータを更新してバッチ処理開始
			await updateUnifiedMetadata({
				batchProcessingMode: true,
				allWorkIds,
				totalBatches: batches.length,
				currentBatch: 0,
				completedBatches: [],
				totalWorks: allWorkIds.length,
				processedWorks: 0,
				basicDataUpdated: 0,
			});

			// バッチ処理対象設定完了
		}

		// 3. バッチ処理実行
		const totalResults = {
			totalWorkCount: 0,
			totalApiCallCount: 0,
			totalBasicDataUpdated: 0,
			totalErrors: [] as string[],
		};

		// 実行時間制限を考慮してバッチ処理
		for (let i = startBatch; i < batches.length; i++) {
			const currentTime = Date.now();
			const elapsedTime = currentTime - startTime;

			// 実行時間制限チェック
			if (elapsedTime > MAX_EXECUTION_TIME) {
				logger.warn(`実行時間制限により処理中断: ${i}/${batches.length}バッチ完了`);

				// 継続処理のためのメタデータ更新（次のバッチから再開）
				await updateUnifiedMetadata({
					currentBatch: i,
					processedWorks: totalResults.totalWorkCount,
					basicDataUpdated: totalResults.totalBasicDataUpdated,
				});

				return {
					workCount: totalResults.totalWorkCount,
					apiCallCount: totalResults.totalApiCallCount,
					basicDataUpdated: totalResults.totalBasicDataUpdated,
					error: `実行時間制限により中断 (${i}/${batches.length}バッチ完了)`,
				};
			}

			const batch = batches[i];
			if (!batch) {
				logger.error(`バッチ ${i + 1} が見つかりません`);
				continue;
			}

			const batchInfo: BatchProcessingInfo = {
				batchNumber: i + 1,
				totalBatches: batches.length,
				workIds: batch,
				startTime: Timestamp.now(),
			};

			// メタデータ更新（バッチ開始）
			await updateUnifiedMetadata({
				currentBatch: i,
				currentBatchStartTime: batchInfo.startTime,
			});

			// バッチ処理実行
			const batchResult = await processSingleBatch(batchInfo);

			// 結果を累積
			totalResults.totalWorkCount += batchResult.workCount;
			totalResults.totalApiCallCount += batchResult.apiCallCount;
			totalResults.totalBasicDataUpdated += batchResult.basicDataUpdated;

			if (batchResult.error) {
				totalResults.totalErrors.push(`バッチ${i + 1}: ${batchResult.error}`);
			}

			// メタデータ更新（バッチ完了）
			const completedBatches = (metadata.completedBatches || []).concat([i]);
			await updateUnifiedMetadata({
				processedWorks: totalResults.totalWorkCount,
				basicDataUpdated: totalResults.totalBasicDataUpdated,
				completedBatches,
			});
		}

		// 4. 全バッチ処理完了
		logger.info(
			`全バッチ完了: ${totalResults.totalBasicDataUpdated}件更新, エラー${totalResults.totalErrors.length}件`,
		);

		// User-Agent使用統計サマリーを出力
		logUserAgentSummary();

		// バッチ処理モードを解除
		await updateUnifiedMetadata({
			batchProcessingMode: false,
			allWorkIds: undefined,
			completedBatches: undefined,
			currentBatch: undefined,
			currentBatchStartTime: undefined,
		});

		return {
			workCount: totalResults.totalWorkCount,
			apiCallCount: totalResults.totalApiCallCount,
			basicDataUpdated: totalResults.totalBasicDataUpdated,
			unificationComplete: totalResults.totalErrors.length === 0,
		};
	} catch (error) {
		logger.error("バッチ処理システムエラー:", { error });
		return {
			workCount: 0,
			apiCallCount: 0,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * 統合データ収集の共通ロジック
 */
async function fetchUnifiedDataCollectionLogic(): Promise<UnifiedFetchResult> {
	try {
		// 1. メタデータ確認
		const metadata = await getOrCreateUnifiedMetadata();

		if (metadata.isInProgress) {
			logger.warn("前回の処理が未完了のため中断");
			return {
				workCount: 0,
				apiCallCount: 0,
				basicDataUpdated: 0,
				error: "前回の処理が完了していません",
			};
		}

		// 2. 処理開始を記録
		await updateUnifiedMetadata({ isInProgress: true });

		// 3. 統合データ収集実行
		const result = await executeUnifiedDataCollection();

		// 4. 成功時のメタデータ更新（簡素化済み）
		if (!result.error) {
			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
				totalWorks: result.workCount,
				processedWorks: result.workCount,
				basicDataUpdated: result.basicDataUpdated,
			});

			logger.info(
				`統合データ収集完了: ${result.basicDataUpdated}件更新, API${result.apiCallCount}件`,
			);
		} else {
			// エラーが発生した場合でも isInProgress を false にリセット
			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: result.error,
			});
		}

		return result;
	} catch (error) {
		logger.error("統合データ収集処理中にエラー:", { error });

		try {
			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗:", { updateError });
		}

		return {
			workCount: 0,
			apiCallCount: 0,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * DLsite統合データ収集処理の Cloud Functions エントリーポイント
 * 基本データ更新 + 時系列データ収集を統合実行（重複API呼び出し完全排除）
 */
export const fetchDLsiteWorksIndividualAPI = async (
	event: CloudEvent<PubsubMessage>,
): Promise<void> => {
	// DLsite統合データ収集エンドポイント開始

	try {
		const message = event.data;

		if (!message) {
			logger.error("CloudEventデータが不足", { event });
			return;
		}

		// メッセージデコード処理
		if (message.data) {
			try {
				Buffer.from(message.data, "base64").toString("utf-8");
			} catch (err) {
				logger.error("Base64デコードエラー:", err);
				return;
			}
		}

		// 統合データ収集処理実行
		const result = await fetchUnifiedDataCollectionLogic();

		if (result.error) {
			logger.warn(`統合データ収集処理エラー: ${result.error}`);
		} else {
			logger.info(
				`統合データ収集完了: ${result.basicDataUpdated}件更新, API${result.apiCallCount}件`,
			);
		}
		return;
	} catch (error) {
		logger.error("統合データ収集処理で例外:", { error });

		try {
			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態記録失敗:", { updateError });
		}
	}
};
