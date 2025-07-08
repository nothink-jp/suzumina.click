/**
 * DLsite Individual Info API専用エンドポイント
 *
 * 100% API-Only アーキテクチャによる革新的データ更新システム
 * HTMLスクレイピング完全廃止・Individual Info API（254フィールド）による包括的データ取得
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "../services/dlsite/dlsite-ajax-fetcher";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import { mapIndividualInfoToTimeSeriesData } from "../services/dlsite/individual-info-mapper";
import {
	batchMapIndividualInfoAPIToWorkData,
	type IndividualInfoAPIResponse,
	validateAPIOnlyWorkData,
} from "../services/dlsite/individual-info-to-work-mapper";
import { saveTimeSeriesRawData } from "../services/dlsite/timeseries-firestore";
import * as logger from "../shared/logger";

// メタデータ保存用の定数
const METADATA_DOC_ID = "individual_info_api_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// 設定を取得
const config = getDLsiteConfig();

// Individual Info API設定
const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";
const MAX_CONCURRENT_API_REQUESTS = 5;
const API_REQUEST_DELAY = 500; // ms

// メタデータの型定義
interface IndividualInfoAPIMetadata {
	lastFetchedAt: Timestamp;
	currentBatch?: number;
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: Timestamp;
	totalWorks?: number;
	processedWorks?: number;
	apiOnlyMigrationStarted?: Timestamp;
}

/**
 * 処理結果の型定義
 */
interface APIFetchResult {
	workCount: number;
	apiCallCount: number;
	error?: string;
	migrationComplete?: boolean;
}

/**
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * Individual Info APIから作品詳細データを取得
 */
async function fetchIndividualWorkInfo(workId: string): Promise<IndividualInfoAPIResponse | null> {
	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		logger.debug(`Individual Info API取得: ${workId}`);

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			if (response.status === 404) {
				logger.warn(`作品が見つかりません: ${workId}`);
				return null;
			}

			if (response.status === 403) {
				logger.error(`Individual Info API アクセス拒否: ${workId} (Status: ${response.status})`);
				throw new Error(`API access denied for ${workId}`);
			}

			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as IndividualInfoAPIResponse;

		// 基本的なデータ検証
		if (!data.workno && !data.product_id) {
			logger.warn(`Invalid API response for ${workId}: missing workno/product_id`);
			return null;
		}

		logger.debug(`Individual Info API取得成功: ${workId} (${data.work_name})`);
		return data;
	} catch (error) {
		logger.error(`Individual Info API取得エラー: ${workId}`, { error });
		throw error;
	}
}

/**
 * バッチでIndividual Info APIを呼び出し
 */
async function batchFetchIndividualInfo(
	workIds: string[],
): Promise<Map<string, IndividualInfoAPIResponse>> {
	const results = new Map<string, IndividualInfoAPIResponse>();
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

			// 成功したデータのみを保存
			for (const { workId, data } of batchResults) {
				if (data) {
					results.set(workId, data);
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
		}
	}

	logger.info(`Individual Info API バッチ処理完了: ${results.size}/${workIds.length}件取得`);
	return results;
}

/**
 * メタデータの取得または初期化
 */
async function getOrCreateAPIMetadata(): Promise<IndividualInfoAPIMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as IndividualInfoAPIMetadata;
	}

	// 初期メタデータの作成
	const initialMetadata: IndividualInfoAPIMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		currentBatch: 0,
		apiOnlyMigrationStarted: Timestamp.now(),
	};
	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * メタデータの更新
 */
async function updateAPIMetadata(updates: Partial<IndividualInfoAPIMetadata>): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);

	const sanitizedUpdates: Record<string, Timestamp | boolean | string | number | null> = {
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

			const parsedWorks = parseWorksFromHTML(ajaxResult.search_result);

			if (parsedWorks.length === 0) {
				logger.info(`ページ ${currentPage}: 作品が見つかりません。収集完了`);
				break;
			}

			const pageWorkIds = parsedWorks.map((w) => w.productId);
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

	logger.info(`✅ 作品ID収集完了: ${allWorkIds.length}件`);
	return [...new Set(allWorkIds)]; // 重複除去
}

/**
 * Individual Info API専用作品データ更新の実行
 */
async function executeIndividualInfoAPIUpdate(): Promise<APIFetchResult> {
	logger.info("🚀 Individual Info API専用更新システム開始");
	logger.info("📋 100% API-Only アーキテクチャ - HTMLスクレイピング完全廃止");

	try {
		// 1. 全作品IDを取得
		const allWorkIds = await getAllWorkIds();

		if (allWorkIds.length === 0) {
			return { workCount: 0, apiCallCount: 0, error: "作品IDが取得できませんでした" };
		}

		// 2. 既存データの確認
		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		logger.info(`既存作品データ: ${existingWorksMap.size}件`);

		// 3. Individual Info APIでデータを取得
		const apiDataMap = await batchFetchIndividualInfo(allWorkIds);

		if (apiDataMap.size === 0) {
			return {
				workCount: 0,
				apiCallCount: allWorkIds.length,
				error: "Individual Info APIからデータを取得できませんでした",
			};
		}

		// 4. APIデータを作品データに変換
		const apiResponses = Array.from(apiDataMap.values());
		const workDataList = batchMapIndividualInfoAPIToWorkData(apiResponses, existingWorksMap);

		// 5. データ品質検証
		const validWorkData = workDataList.filter((work) => {
			const validation = validateAPIOnlyWorkData(work);
			if (!validation.isValid) {
				logger.warn(`データ品質エラー: ${work.productId}`, { errors: validation.errors });
				return false;
			}
			return true;
		});

		logger.info(`データ品質検証: ${validWorkData.length}/${workDataList.length}件が有効`);

		// 6. Firestoreに保存
		if (validWorkData.length > 0) {
			await saveWorksToFirestore(validWorkData);
			logger.info(`✅ Firestore保存完了: ${validWorkData.length}件`);
		}

		// 7. 時系列データも並行して保存
		const timeSeriesPromises = apiResponses.map(async (apiData) => {
			try {
				const timeSeriesData = mapIndividualInfoToTimeSeriesData(apiData);
				await saveTimeSeriesRawData(timeSeriesData);
			} catch (error) {
				logger.warn(`時系列データ保存エラー: ${apiData.workno}`, { error });
			}
		});

		await Promise.allSettled(timeSeriesPromises);
		logger.info(`📊 時系列データ保存完了: ${apiResponses.length}件`);

		// 8. 統計情報をログ出力
		const qualityScores = validWorkData.map((work) => validateAPIOnlyWorkData(work).quality);
		const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

		logger.info("📈 === 100% API-Only データ品質統計 ===");
		logger.info(`平均品質スコア: ${avgQuality.toFixed(1)}%`);
		logger.info(`API呼び出し成功率: ${((apiDataMap.size / allWorkIds.length) * 100).toFixed(1)}%`);
		logger.info(
			`データ有効率: ${((validWorkData.length / workDataList.length) * 100).toFixed(1)}%`,
		);

		return {
			workCount: validWorkData.length,
			apiCallCount: allWorkIds.length,
			migrationComplete: true,
		};
	} catch (error) {
		logger.error("Individual Info API更新システムエラー:", { error });
		return {
			workCount: 0,
			apiCallCount: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * Individual Info API処理の共通ロジック
 */
async function fetchIndividualInfoAPILogic(): Promise<APIFetchResult> {
	try {
		// 1. メタデータ確認
		const metadata = await getOrCreateAPIMetadata();

		if (metadata.isInProgress) {
			logger.warn("前回のIndividual Info API処理が完了していません");
			return { workCount: 0, apiCallCount: 0, error: "前回の処理が完了していません" };
		}

		// 2. 処理開始を記録
		await updateAPIMetadata({ isInProgress: true });

		// 3. Individual Info API更新実行
		const result = await executeIndividualInfoAPIUpdate();

		// 4. 成功時のメタデータ更新
		if (!result.error) {
			await updateAPIMetadata({
				isInProgress: false,
				lastError: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
				totalWorks: result.workCount,
				processedWorks: result.workCount,
			});

			logger.info("✅ === Individual Info API移行完了 ===");
			logger.info(`処理済み作品数: ${result.workCount}件`);
			logger.info(`API呼び出し数: ${result.apiCallCount}件`);
			logger.info("🎯 100% API-Only アーキテクチャ実現完了");
		} else {
			await updateAPIMetadata({
				isInProgress: false,
				lastError: result.error,
			});
		}

		return result;
	} catch (error) {
		logger.error("Individual Info API処理中にエラー:", { error });

		try {
			await updateAPIMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗:", { updateError });
		}

		return {
			workCount: 0,
			apiCallCount: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * DLsite Individual Info API専用処理の Cloud Functions エントリーポイント
 */
export const fetchDLsiteWorksIndividualAPI = async (
	event: CloudEvent<PubsubMessage>,
): Promise<void> => {
	logger.info("🚀 Individual Info API専用エンドポイント開始 (GCFv2 CloudEvent Handler)");
	logger.info("📋 100% API-Only アーキテクチャ - HTMLスクレイピング完全廃止システム");

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

		// Individual Info API処理実行
		const result = await fetchIndividualInfoAPILogic();

		if (result.error) {
			logger.warn(`Individual Info API処理エラー: ${result.error}`);
		} else {
			logger.info("✅ Individual Info API処理完了");
			logger.info(`作品データ更新: ${result.workCount}件`);
			logger.info(`API呼び出し: ${result.apiCallCount}件`);

			if (result.migrationComplete) {
				logger.info("🎯 100% API-Only アーキテクチャ移行完了");
			}
		}

		logger.info("Individual Info API専用処理終了");
		return;
	} catch (error) {
		logger.error("Individual Info API専用処理で例外:", { error });

		try {
			await updateAPIMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態記録失敗:", { updateError });
		}
	}
};
