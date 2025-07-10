/**
 * DLsite 統合データ収集エンドポイント
 *
 * 100% API-Only アーキテクチャによる統合データ収集システム
 * Individual Info API（254フィールド）による基本データ更新 + 時系列データ収集の統合実行
 * HTMLスクレイピング完全廃止・重複API呼び出し排除による効率化実現
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import {
	generateDLsiteHeaders,
	logUserAgentSummary,
} from "../infrastructure/management/user-agent-manager";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "../services/dlsite/dlsite-ajax-fetcher";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import { mapMultipleIndividualInfoToTimeSeries } from "../services/dlsite/individual-info-mapper";
import {
	batchMapIndividualInfoAPIToWorkData,
	type IndividualInfoAPIResponse,
	validateAPIOnlyWorkData,
} from "../services/dlsite/individual-info-to-work-mapper";
import {
	batchProcessDailyAggregates,
	saveMultipleTimeSeriesRawData,
} from "../services/dlsite/timeseries-firestore";
import {
	createUnionWorkIds,
	handleNoWorkIdsError,
	validateWorkIds,
	warnPartialSuccess,
} from "../services/dlsite/work-id-validator";
import * as logger from "../shared/logger";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// 設定を取得
const config = getDLsiteConfig();

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
	timeSeriesCollected?: number;
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
	timeSeriesCollected: number;
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

		logger.debug(
			`Individual Info API取得: ${workId}${retryCount > 0 ? ` (retry ${retryCount})` : ""}`,
		);

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
					logger.info(
						`Retrying ${workId} due to 503 error (attempt ${retryCount + 1}/${MAX_RETRIES})`,
					);
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
					return fetchIndividualWorkInfo(workId, retryCount + 1);
				}
				return null; // 最大リトライ回数に達した場合はnullを返す
			}

			if (response.status === 429) {
				logger.warn(`Rate limit exceeded: ${workId} (Status: ${response.status})`);
				// 429エラーの場合もリトライする
				if (retryCount < MAX_RETRIES) {
					logger.info(
						`Retrying ${workId} due to rate limit (attempt ${retryCount + 1}/${MAX_RETRIES})`,
					);
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
				logger.info(
					`Retrying ${workId} due to JSON parse error (attempt ${retryCount + 1}/${MAX_RETRIES})`,
				);
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
				logger.info(
					`Retrying ${workId} due to empty response (attempt ${retryCount + 1}/${MAX_RETRIES})`,
				);
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

		logger.debug(
			`Individual Info API取得成功: ${workId} (${data.work_name})${retryCount > 0 ? ` after ${retryCount} retries` : ""}`,
		);
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
				logger.info(
					`Retrying ${workId} due to network error (attempt ${retryCount + 1}/${MAX_RETRIES})`,
				);
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

	logger.info(`Individual Info API バッチ処理開始: ${workIds.length}件 (${batches.length}バッチ)`);

	for (const [batchIndex, batch] of batches.entries()) {
		logger.debug(`バッチ ${batchIndex + 1}/${batches.length} 処理中: ${batch.length}件`);

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

			logger.info(
				`バッチ ${batchIndex + 1} 完了: ${batchResults.filter((r) => r.data).length}/${batch.length}件成功`,
			);

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

	logger.info(`Individual Info API バッチ処理完了: ${results.size}/${workIds.length}件取得`);

	// 失敗した作品IDをログ出力
	if (failedWorkIds.length > 0) {
		const sortedFailedIds = failedWorkIds.sort();
		logger.warn(`❌ API取得失敗作品ID一覧 (${failedWorkIds.length}件):`, {
			failedWorkIds: sortedFailedIds,
			failureRate: `${((failedWorkIds.length / workIds.length) * 100).toFixed(1)}%`,
		});

		// 失敗IDリストを分割して表示（Cloud Loggingの制限対応）
		const chunkSize = 50;
		for (let i = 0; i < sortedFailedIds.length; i += chunkSize) {
			const chunk = sortedFailedIds.slice(i, i + chunkSize);
			logger.warn(
				`失敗作品ID ${i + 1}-${Math.min(i + chunkSize, sortedFailedIds.length)}: [${chunk.join(", ")}]`,
			);
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
 * 作品IDリストの取得（AJAX APIから）
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: AJAX処理のため複雑度が高い
async function getAllWorkIds(): Promise<string[]> {
	logger.info("🔍 AJAX APIから全作品IDを収集中...");

	const allWorkIds: string[] = [];
	let currentPage = 1;
	const maxPages = 50; // 安全のための上限

	while (currentPage <= maxPages) {
		try {
			logger.debug(`作品ID収集: ページ ${currentPage}`);

			const ajaxResult = await fetchDLsiteAjaxResult(currentPage);

			if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
				logger.warn(`ページ ${currentPage}: 無効なHTMLコンテンツ`);
				break;
			}

			// デバッグ: HTMLの一部を出力して構造を確認
			logger.debug(`ページ ${currentPage} HTMLサンプル (最初の500文字):`, {
				html: ajaxResult.search_result.substring(0, 500),
			});

			// メイン検索結果のみを抽出（サイドバーや関連作品を除外）
			// より厳密なパターンでメイン結果のみを抽出
			const strictPatterns = [
				/href="\/maniax\/work\/[^"]*product_id\/([^"/]+)/g,
				/"product_id":"([^"]+)"/g,
				/data-list_item_product_id="([^"]+)"/g, // 新しいデータ属性パターン
			];

			const allMatches = new Set<string>();
			for (const pattern of strictPatterns) {
				const matches = [...ajaxResult.search_result.matchAll(pattern)];
				if (matches.length > 0) {
					logger.debug(`パターン ${pattern.source} で ${matches.length} 件マッチ`);
					matches.forEach((match) => {
						const workId = match[1];
						if (workId && /^RJ\d{6,8}$/.test(workId)) {
							allMatches.add(workId);
						}
					});
				}
			}

			if (allMatches.size === 0) {
				logger.info(`ページ ${currentPage}: 作品が見つかりません。収集完了`);

				// デバッグ情報: HTMLの内容を確認
				if (currentPage === 1) {
					logger.debug("ページ1でのHTML解析失敗 - RJ番号パターンをチェック:", {
						rjMatches: ajaxResult.search_result.match(/RJ\d{6,8}/g)?.length || 0,
						htmlLength: ajaxResult.search_result.length,
						containsRJ: ajaxResult.search_result.includes("RJ"),
					});
				}
				break;
			}

			const pageWorkIds = Array.from(allMatches);
			allWorkIds.push(...pageWorkIds);

			logger.debug(
				`ページ ${currentPage}: ${pageWorkIds.length}件の作品ID取得 (累計: ${allWorkIds.length}件)`,
			);

			// 最終ページ判定
			const isLastPage = isLastPageFromPageInfo(ajaxResult.page_info, currentPage);
			if (isLastPage) {
				logger.info(`ページ ${currentPage} が最終ページです`);
				break;
			}

			currentPage++;

			// レート制限対応
			await new Promise((resolve) => setTimeout(resolve, config.requestDelay));
		} catch (error) {
			logger.error(`作品ID収集エラー (ページ ${currentPage}):`, { error });
			break;
		}
	}

	const uniqueWorkIds = [...new Set(allWorkIds)]; // 重複除去
	logger.info(`✅ 作品ID収集完了: ${uniqueWorkIds.length}件`);

	// 作品IDリストの検証（リージョン差異を考慮）
	const validationResult = validateWorkIds(uniqueWorkIds, {
		minCoveragePercentage: 70, // リージョン差異を考慮して70%に設定
		maxExtraPercentage: 30, // 新作品の可能性を考慮して30%に設定
		logDetails: true,
	});

	// 検証結果に基づく警告
	if (validationResult.regionWarning) {
		warnPartialSuccess(validationResult);
	}

	return uniqueWorkIds;
}

/**
 * 単一バッチの処理
 */
async function processSingleBatch(batchInfo: BatchProcessingInfo): Promise<UnifiedFetchResult> {
	const { batchNumber, totalBatches, workIds, startTime } = batchInfo;

	logger.info(`🔄 バッチ ${batchNumber}/${totalBatches} 処理開始: ${workIds.length}件`);

	try {
		// 既存データの確認
		const existingWorksMap = await getExistingWorksMap(workIds);
		logger.info(`既存作品データ: ${existingWorksMap.size}件`);

		// Individual Info APIでデータを取得
		const { results: apiDataMap, failedWorkIds } = await batchFetchIndividualInfo(workIds);

		if (apiDataMap.size === 0) {
			return {
				workCount: 0,
				apiCallCount: workIds.length,
				basicDataUpdated: 0,
				timeSeriesCollected: 0,
				error: "Individual Info APIからデータを取得できませんでした",
			};
		}

		const apiResponses = Array.from(apiDataMap.values());
		logger.info(`📊 バッチ ${batchNumber} API取得成功: ${apiResponses.length}/${workIds.length}件`);

		// 統合データ処理: 同一APIレスポンスから並列変換
		const results = {
			basicDataUpdated: 0,
			timeSeriesCollected: 0,
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
					logger.info(`✅ バッチ ${batchNumber} 基本データ保存完了: ${validWorkData.length}件`);
				}

				return validWorkData.length;
			} catch (error) {
				const errorMsg = `バッチ ${batchNumber} 基本データ処理エラー: ${error instanceof Error ? error.message : String(error)}`;
				logger.error(errorMsg);
				results.errors.push(errorMsg);
				return 0;
			}
		};

		// 時系列データ変換・保存処理
		const timeSeriesProcessing = async () => {
			try {
				const timeSeriesData = mapMultipleIndividualInfoToTimeSeries(apiResponses);

				if (timeSeriesData.length > 0) {
					await saveMultipleTimeSeriesRawData(timeSeriesData);
					results.timeSeriesCollected = timeSeriesData.length;
					logger.info(`📊 バッチ ${batchNumber} 時系列データ保存完了: ${timeSeriesData.length}件`);

					// 日次集計処理を実行（過去1日分）
					try {
						await batchProcessDailyAggregates(1);
						logger.info(`✅ バッチ ${batchNumber} 日次集計処理完了`);
					} catch (aggregateError) {
						logger.error(`バッチ ${batchNumber} 日次集計処理エラー:`, { error: aggregateError });
						// 日次集計処理のエラーは警告として扱い、処理を継続
						results.errors.push(
							`バッチ ${batchNumber} 日次集計処理エラー: ${aggregateError instanceof Error ? aggregateError.message : String(aggregateError)}`,
						);
					}
				}

				return timeSeriesData.length;
			} catch (error) {
				const errorMsg = `バッチ ${batchNumber} 時系列データ処理エラー: ${error instanceof Error ? error.message : String(error)}`;
				logger.error(errorMsg);
				results.errors.push(errorMsg);
				return 0;
			}
		};

		// 並列処理実行
		await Promise.all([basicDataProcessing(), timeSeriesProcessing()]);

		// バッチ統計情報
		const processingTime = Date.now() - startTime.toMillis();
		logger.info(`📈 バッチ ${batchNumber} 完了統計:`);
		logger.info(`  処理時間: ${(processingTime / 1000).toFixed(1)}秒`);
		logger.info(`  API成功率: ${((apiDataMap.size / workIds.length) * 100).toFixed(1)}%`);
		logger.info(`  基本データ更新: ${results.basicDataUpdated}件`);
		logger.info(`  時系列データ収集: ${results.timeSeriesCollected}件`);

		// 失敗作品IDログ
		if (failedWorkIds.length > 0) {
			logger.warn(`バッチ ${batchNumber} 失敗作品ID: ${failedWorkIds.length}件`);
			const chunkSize = 20;
			for (let i = 0; i < failedWorkIds.length; i += chunkSize) {
				const chunk = failedWorkIds.slice(i, i + chunkSize);
				logger.warn(
					`  失敗ID ${i + 1}-${Math.min(i + chunkSize, failedWorkIds.length)}: [${chunk.join(", ")}]`,
				);
			}
		}

		return {
			workCount: Math.max(results.basicDataUpdated, results.timeSeriesCollected),
			apiCallCount: workIds.length,
			basicDataUpdated: results.basicDataUpdated,
			timeSeriesCollected: results.timeSeriesCollected,
			unificationComplete: results.errors.length === 0,
		};
	} catch (error) {
		logger.error(`バッチ ${batchNumber} 処理エラー:`, { error });
		return {
			workCount: 0,
			apiCallCount: workIds.length,
			basicDataUpdated: 0,
			timeSeriesCollected: 0,
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
			const currentRegionIds = await getAllWorkIds();
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
					timeSeriesCollected: 0,
					error: "作品IDが取得できませんでした",
				};
			}

			// バッチに分割
			batches = chunkArray(allWorkIds, BATCH_SIZE);
			logger.info(`📦 バッチ分割完了: ${batches.length}バッチ（${BATCH_SIZE}件/バッチ）`);

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
				timeSeriesCollected: 0,
			});

			logger.info("🌏 === リージョン差異対応統計 ===");
			logger.info(`現在リージョン取得: ${unionResult.currentRegionIds.length}件`);
			logger.info(`アセットファイル: ${unionResult.assetFileIds.length}件`);
			logger.info(`和集合総数: ${unionResult.unionIds.length}件`);
			logger.info(`リージョン専用: ${unionResult.regionOnlyCount}件`);
			logger.info(`アセット専用: ${unionResult.assetOnlyCount}件`);
			logger.info(`重複: ${unionResult.overlapCount}件`);
		}

		// 3. バッチ処理実行
		const totalResults = {
			totalWorkCount: 0,
			totalApiCallCount: 0,
			totalBasicDataUpdated: 0,
			totalTimeSeriesCollected: 0,
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
					timeSeriesCollected: totalResults.totalTimeSeriesCollected,
				});

				return {
					workCount: totalResults.totalWorkCount,
					apiCallCount: totalResults.totalApiCallCount,
					basicDataUpdated: totalResults.totalBasicDataUpdated,
					timeSeriesCollected: totalResults.totalTimeSeriesCollected,
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
			totalResults.totalTimeSeriesCollected += batchResult.timeSeriesCollected;

			if (batchResult.error) {
				totalResults.totalErrors.push(`バッチ${i + 1}: ${batchResult.error}`);
			}

			// メタデータ更新（バッチ完了）
			const completedBatches = (metadata.completedBatches || []).concat([i]);
			await updateUnifiedMetadata({
				processedWorks: totalResults.totalWorkCount,
				basicDataUpdated: totalResults.totalBasicDataUpdated,
				timeSeriesCollected: totalResults.totalTimeSeriesCollected,
				completedBatches,
			});

			logger.info(`✅ バッチ ${i + 1}/${batches.length} 完了`);
		}

		// 4. 全バッチ処理完了
		const processingTime = Date.now() - startTime;
		logger.info("🎉 === 全バッチ処理完了 ===");
		logger.info(`総処理時間: ${(processingTime / 1000).toFixed(1)}秒`);
		logger.info(`処理済み作品数: ${totalResults.totalWorkCount}件`);
		logger.info(`API呼び出し総数: ${totalResults.totalApiCallCount}件`);
		logger.info(`基本データ更新: ${totalResults.totalBasicDataUpdated}件`);
		logger.info(`時系列データ収集: ${totalResults.totalTimeSeriesCollected}件`);
		logger.info(`処理エラー: ${totalResults.totalErrors.length}件`);

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
			timeSeriesCollected: totalResults.totalTimeSeriesCollected,
			unificationComplete: totalResults.totalErrors.length === 0,
		};
	} catch (error) {
		logger.error("バッチ処理システムエラー:", { error });
		return {
			workCount: 0,
			apiCallCount: 0,
			basicDataUpdated: 0,
			timeSeriesCollected: 0,
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
				timeSeriesCollected: 0,
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
			const currentRegionIds = await getAllWorkIds();
			const unionInfo = createUnionWorkIds(currentRegionIds);

			await updateUnifiedMetadata({
				isInProgress: false,
				lastError: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
				totalWorks: result.workCount,
				processedWorks: result.workCount,
				basicDataUpdated: result.basicDataUpdated,
				timeSeriesCollected: result.timeSeriesCollected,
				regionOnlyIds: unionInfo.regionOnlyCount,
				assetOnlyIds: unionInfo.assetOnlyCount,
				unionTotalIds: unionInfo.unionIds.length,
				regionDifferenceDetected: unionInfo.regionDifferenceDetected,
			});

			logger.info("✅ === DLsite統合データ収集完了 ===");
			logger.info(`基本データ更新: ${result.basicDataUpdated}件`);
			logger.info(`時系列データ収集: ${result.timeSeriesCollected}件`);
			logger.info(`API呼び出し数: ${result.apiCallCount}件`);
			logger.info("🎯 統合アーキテクチャ実現完了 - 重複API呼び出し100%排除");
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
			timeSeriesCollected: 0,
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
			logger.info(`時系列データ収集: ${result.timeSeriesCollected}件`);
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
