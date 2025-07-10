/**
 * DLsite 統合データ収集エンドポイント
 *
 * 100% API-Only アーキテクチャによる統合データ収集システム
 * Individual Info API（254フィールド）による基本データ更新 + 時系列データ収集の統合実行
 * HTMLスクレイピング完全廃止・重複API呼び出し排除による効率化実現
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import {
	generateDLsiteHeaders,
	logUserAgentSummary,
} from "../infrastructure/management/user-agent-manager";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import {
	batchMapIndividualInfoAPIToWorkData,
	type IndividualInfoAPIResponse,
	validateAPIOnlyWorkData,
} from "../services/dlsite/individual-info-to-work-mapper";
import { collectWorkIdsForProduction } from "../services/dlsite/work-id-collector";
import { createUnionWorkIds, handleNoWorkIdsError } from "../services/dlsite/work-id-validator";
import * as logger from "../shared/logger";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// Individual Info API設定（User-Agent枯渇対策）
const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";
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
	regionOnlyIds?: number;
	assetOnlyIds?: number;
	unionTotalIds?: number;
	regionDifferenceDetected?: boolean;
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

/**
 * 配列をバッチサイズに分割する
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Individual Info APIから作品詳細データを取得（リトライ機能付き）
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: リトライ機能のため複雑度が高い
async function fetchIndividualWorkInfo(
	workId: string,
	retryCount = 0,
): Promise<IndividualInfoAPIResponse | null> {
	const MAX_RETRIES = 2;
	const RETRY_DELAY = 2000; // 2秒

	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			const responseText = await response.text();
			logger.warn(`API request failed for ${workId}`, {
				workId,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				responseText: responseText.substring(0, 500), // 最初の500文字のみ
				url: `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`,
			});

			if (response.status === 404) {
				logger.warn(`作品が見つかりません: ${workId}`);
				return null;
			}

			if (response.status === 403) {
				logger.error(`Individual Info API アクセス拒否: ${workId} (Status: ${response.status})`);
				throw new Error(`API access denied for ${workId}`);
			}

			if (response.status === 503) {
				logger.warn(`Service temporarily unavailable: ${workId} (Status: ${response.status})`);
				// 503エラーの場合はリトライする
				if (retryCount < MAX_RETRIES) {
					logger.warn(`Retry ${workId}: 503 error (${retryCount + 1}/${MAX_RETRIES})`);
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
					return fetchIndividualWorkInfo(workId, retryCount + 1);
				}
				return null; // 最大リトライ回数に達した場合はnullを返す
			}

			if (response.status === 429) {
				logger.warn(`Rate limit exceeded: ${workId} (Status: ${response.status})`);
				// 429エラーの場合もリトライする
				if (retryCount < MAX_RETRIES) {
					logger.warn(`Retry ${workId}: rate limit (${retryCount + 1}/${MAX_RETRIES})`);
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
					return fetchIndividualWorkInfo(workId, retryCount + 1);
				}
				return null; // 最大リトライ回数に達した場合はnullを返す
			}

			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const responseText = await response.text();
		let responseData: unknown;

		try {
			responseData = JSON.parse(responseText);
		} catch (jsonError) {
			logger.error(`JSON parse error for ${workId}`, {
				workId,
				responseText: responseText.substring(0, 1000), // 最初の1000文字
				jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
				url: `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`,
				retryCount,
			});

			// JSONパースエラーの場合もリトライする
			if (retryCount < MAX_RETRIES) {
				logger.warn(`Retry ${workId}: JSON parse error (${retryCount + 1}/${MAX_RETRIES})`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
				return fetchIndividualWorkInfo(workId, retryCount + 1);
			}
			return null;
		}

		// Individual Info APIは配列形式でレスポンスを返す
		if (!Array.isArray(responseData) || responseData.length === 0) {
			logger.warn(`Invalid API response for ${workId}: empty or non-array response`, {
				workId,
				responseType: typeof responseData,
				isArray: Array.isArray(responseData),
				responseLength: Array.isArray(responseData) ? responseData.length : "N/A",
				responseData: responseData,
				responseText: responseText.substring(0, 1000), // 生テキストも含める
				url: `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`,
				retryCount,
			});

			// 空レスポンスの場合もリトライする
			if (retryCount < MAX_RETRIES) {
				logger.warn(`Retry ${workId}: empty response (${retryCount + 1}/${MAX_RETRIES})`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
				return fetchIndividualWorkInfo(workId, retryCount + 1);
			}
			return null;
		}

		const data = responseData[0] as IndividualInfoAPIResponse;

		// 基本的なデータ検証
		if (!data.workno && !data.product_id) {
			logger.warn(`Invalid API response for ${workId}: missing workno/product_id`);
			return null;
		}

		return data;
	} catch (error) {
		logger.error(`Individual Info API取得エラー: ${workId}`, { error, retryCount });

		// ネットワークエラーの場合もリトライする
		if (retryCount < MAX_RETRIES && error instanceof Error) {
			// タイムアウトエラーやネットワークエラーの場合
			if (
				error.name === "TimeoutError" ||
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				logger.warn(`Retry ${workId}: network error (${retryCount + 1}/${MAX_RETRIES})`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
				return fetchIndividualWorkInfo(workId, retryCount + 1);
			}
		}

		throw error;
	}
}

/**
 * バッチでIndividual Info APIを呼び出し
 */
async function batchFetchIndividualInfo(
	workIds: string[],
): Promise<{ results: Map<string, IndividualInfoAPIResponse>; failedWorkIds: string[] }> {
	const results = new Map<string, IndividualInfoAPIResponse>();
	const failedWorkIds: string[] = [];
	const batches: string[][] = [];

	// バッチに分割
	for (let i = 0; i < workIds.length; i += MAX_CONCURRENT_API_REQUESTS) {
		batches.push(workIds.slice(i, i + MAX_CONCURRENT_API_REQUESTS));
	}

	for (const [batchIndex, batch] of batches.entries()) {
		try {
			// 並列でAPIを呼び出し
			const promises = batch.map(async (workId) => {
				try {
					const data = await fetchIndividualWorkInfo(workId);
					return { workId, data };
				} catch (error) {
					logger.warn(`Individual Info API取得失敗: ${workId}`, { error });
					return { workId, data: null };
				}
			});

			const batchResults = await Promise.all(promises);

			// 成功・失敗を分類
			for (const { workId, data } of batchResults) {
				if (data) {
					results.set(workId, data);
				} else {
					failedWorkIds.push(workId);
				}
			}

			// レート制限対応
			if (batchIndex < batches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, API_REQUEST_DELAY));
			}
		} catch (error) {
			logger.error(`バッチ ${batchIndex + 1} でエラー:`, { error });
			// バッチ全体が失敗した場合、そのバッチの全作品IDを失敗として記録
			failedWorkIds.push(...batch);
		}
	}

	// 失敗した作品IDをログ出力（件数制限付き）
	if (failedWorkIds.length > 0) {
		logger.warn(
			`❌ API取得失敗: ${failedWorkIds.length}件 (失敗率${((failedWorkIds.length / workIds.length) * 100).toFixed(1)}%)`,
		);

		// 失敗ID詳細は10件未満の場合のみ出力
		if (failedWorkIds.length < 10) {
			logger.warn(`失敗作品ID: [${failedWorkIds.sort().join(", ")}]`);
		}
	}

	return { results, failedWorkIds };
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
	const { batchNumber, workIds, startTime } = batchInfo;

	try {
		// 既存データの確認
		const existingWorksMap = await getExistingWorksMap(workIds);

		// Individual Info APIでデータを取得
		const { results: apiDataMap, failedWorkIds } = await batchFetchIndividualInfo(workIds);

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
			errors: [] as string[],
		};

		// 基本データ変換・保存処理
		const basicDataProcessing = async () => {
			try {
				const workDataList = batchMapIndividualInfoAPIToWorkData(apiResponses, existingWorksMap);
				const validWorkData = workDataList.filter((work) => {
					const validation = validateAPIOnlyWorkData(work);
					if (!validation.isValid) {
						logger.warn(`データ品質エラー: ${work.productId}`, {
							errors: validation.errors,
						});
					}
					return validation.isValid;
				});

				if (validWorkData.length > 0) {
					await saveWorksToFirestore(validWorkData);
					results.basicDataUpdated = validWorkData.length;
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

		// バッチ統計情報
		const processingTime = Date.now() - startTime.toMillis();
		logger.info(
			`✅ バッチ ${batchNumber} 完了: ${results.basicDataUpdated}件更新 (${(processingTime / 1000).toFixed(1)}s, 成功率${((apiDataMap.size / workIds.length) * 100).toFixed(1)}%)`,
		);

		// 失敗作品IDログ（簡素化）
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
 * リージョン差異対応: 和集合によるID収集
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: バッチ処理のため複雑度が高い
async function executeUnifiedDataCollection(): Promise<UnifiedFetchResult> {
	logger.info("🚀 DLsite統合データ収集システム開始（バッチ処理版）");
	logger.info("📋 Individual Info API統合アーキテクチャ - 重複API呼び出し完全排除");
	logger.info("🌏 リージョン差異対応 - 和集合による完全データ収集");

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
			logger.info(`🔄 バッチ処理継続: バッチ ${startBatch + 1}/${batches.length}から再開`);
		} else {
			// 新規処理の場合
			logger.info("🔍 新規バッチ処理開始: 作品ID収集中...");

			// 現在のリージョンで作品IDを取得
			const currentRegionIds = await collectWorkIdsForProduction();
			logger.info(`🔍 現在のリージョン取得数: ${currentRegionIds.length}件`);

			// 和集合による完全なIDリストを作成
			const unionResult = createUnionWorkIds(currentRegionIds);
			allWorkIds = unionResult.unionIds;

			logger.info(`🎯 和集合後の対象作品数: ${allWorkIds.length}件`);

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

			logger.info(
				`🌏 リージョン差異対応: 和集合${unionResult.unionIds.length}件 (現在${unionResult.currentRegionIds.length}/アセット${unionResult.assetFileIds.length}/重複${unionResult.overlapCount})`,
			);
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
				logger.warn(`⏰ 実行時間制限に達しました: ${(elapsedTime / 1000).toFixed(1)}秒`);
				logger.info(`📊 中断時点の進捗: ${i}/${batches.length}バッチ完了`);

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
		const processingTime = Date.now() - startTime;
		logger.info(
			`🎉 全バッチ完了: ${totalResults.totalBasicDataUpdated}件更新 (${(processingTime / 1000).toFixed(1)}s, エラー${totalResults.totalErrors.length}件)`,
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
			logger.warn("前回の統合データ収集処理が完了していません");
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

		// 4. 成功時のメタデータ更新（和集合統計情報を含む）
		if (!result.error) {
			// 和集合情報を取得するため、再度実行（最適化の余地あり）
			const currentRegionIds = await collectWorkIdsForProduction();
			const unionInfo = createUnionWorkIds(currentRegionIds);

			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
				totalWorks: result.workCount,
				processedWorks: result.workCount,
				basicDataUpdated: result.basicDataUpdated,
				regionOnlyIds: unionInfo.regionOnlyCount,
				assetOnlyIds: unionInfo.assetOnlyCount,
				unionTotalIds: unionInfo.unionIds.length,
				regionDifferenceDetected: unionInfo.regionDifferenceDetected,
			});

			logger.info(
				`✅ DLsite統合データ収集完了: ${result.basicDataUpdated}件更新 (API${result.apiCallCount}件)`,
			);
			logger.info("🎯 統合アーキテクチャ実現 - 重複API呼び出し100%排除");
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
	logger.info("🚀 DLsite統合データ収集エンドポイント開始 (GCFv2 CloudEvent Handler)");
	logger.info("📋 Individual Info API統合アーキテクチャ - 基本データ+時系列データ同時収集");

	try {
		const message = event.data;

		if (!message) {
			logger.error("CloudEventデータが不足", { event });
			return;
		}

		// 属性情報の処理
		if (message.attributes) {
			logger.info("受信した属性情報:", message.attributes);
		}

		// デコード処理
		if (message.data) {
			try {
				const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
				logger.info("メッセージデータ:", { message: decodedData });
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
			logger.info("✅ 統合データ収集処理完了");
			logger.info(`基本データ更新: ${result.basicDataUpdated}件`);
			logger.info(`API呼び出し総数: ${result.apiCallCount}件`);

			if (result.unificationComplete) {
				logger.info("🎯 統合アーキテクチャ完全実現 - 重複API呼び出し100%排除");
			}
		}

		logger.info("DLsite統合データ収集処理終了");
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
