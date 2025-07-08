/**
 * DLsite時系列データ収集エンドポイント
 * Individual Info APIによる6地域価格・販売・評価データの収集と日次集計処理
 *
 * ⚠️ **非推奨 (Deprecated)**: このFunctionは統合アーキテクチャにより廃止予定です
 * 新しい統合システムでは `fetchDLsiteWorksIndividualAPI` が基本データ更新と時系列データ収集を同時実行します
 * 重複API呼び出しを完全排除し、効率化を実現した統合システムをご利用ください
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import {
	type IndividualInfoAPIResponse,
	mapMultipleIndividualInfoToTimeSeries,
} from "../services/dlsite/individual-info-mapper";
import {
	batchProcessDailyAggregates,
	deleteExpiredRawData,
	saveMultipleTimeSeriesRawData,
} from "../services/dlsite/timeseries-firestore";
import * as logger from "../shared/logger";

// 設定を取得
const config = getDLsiteConfig();

// メタデータ保存用の定数
const TIMESERIES_METADATA_COLLECTION = "dlsiteTimeseriesMetadata";
const TIMESERIES_METADATA_DOC_ID = "timeseries_fetch_metadata";

// 時系列データ収集メタデータの型定義
interface TimeseriesMetadata {
	lastFetchedAt: Timestamp;
	isInProgress: boolean;
	lastError?: string;
	totalWorksProcessed?: number;
	currentBatch?: number;
	lastDailyAggregationAt?: Timestamp;
	lastCleanupAt?: Timestamp;
}

/**
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * 時系列データ収集用メタデータの取得または初期化
 */
async function getOrCreateTimeseriesMetadata(): Promise<TimeseriesMetadata> {
	const metadataRef = firestore
		.collection(TIMESERIES_METADATA_COLLECTION)
		.doc(TIMESERIES_METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as TimeseriesMetadata;
	}

	// 初期メタデータの作成
	const initialMetadata: TimeseriesMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		currentBatch: 0,
	};
	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * 時系列データ収集用メタデータの更新
 */
async function updateTimeseriesMetadata(updates: Partial<TimeseriesMetadata>): Promise<void> {
	const metadataRef = firestore
		.collection(TIMESERIES_METADATA_COLLECTION)
		.doc(TIMESERIES_METADATA_DOC_ID);

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
 * Individual Info API を呼び出して作品情報を取得
 */
async function fetchIndividualInfoAPI(workId: string): Promise<IndividualInfoAPIResponse | null> {
	try {
		const url = `https://www.dlsite.com/maniax/api/=/product.json?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		const response = await fetch(url, {
			headers,
			method: "GET",
		});

		if (!response.ok) {
			logger.warn("Individual Info API リクエスト失敗", {
				operation: "fetchIndividualInfoAPI",
				workId,
				status: response.status,
				statusText: response.statusText,
			});
			return null;
		}

		const data = (await response.json()) as IndividualInfoAPIResponse;

		// レスポンスの基本検証
		if (!data.workno && !data.product_id) {
			logger.warn("Individual Info API レスポンスに作品IDがありません", {
				operation: "fetchIndividualInfoAPI",
				workId,
			});
			return null;
		}

		return data;
	} catch (error) {
		logger.error("Individual Info API 呼び出しエラー", {
			operation: "fetchIndividualInfoAPI",
			workId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 複数作品のIndividual Info APIを並列で取得
 */
async function fetchMultipleIndividualInfoAPI(
	workIds: string[],
	batchSize = 10,
): Promise<IndividualInfoAPIResponse[]> {
	const results: IndividualInfoAPIResponse[] = [];

	// バッチ処理で並列実行
	for (let i = 0; i < workIds.length; i += batchSize) {
		const batch = workIds.slice(i, i + batchSize);

		const batchPromises = batch.map((workId) => fetchIndividualInfoAPI(workId));
		const batchResults = await Promise.allSettled(batchPromises);

		for (const result of batchResults) {
			if (result.status === "fulfilled" && result.value) {
				results.push(result.value);
			}
		}

		// レート制限対応
		if (i + batchSize < workIds.length) {
			await new Promise((resolve) => setTimeout(resolve, config.requestDelay * 2));
		}
	}

	return results;
}

/**
 * Firestoreから既存作品IDを取得
 */
async function getExistingWorkIds(limit = 100): Promise<string[]> {
	try {
		const worksCollection = firestore.collection("works");
		const snapshot = await worksCollection.select("productId").limit(limit).get();

		const workIds: string[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			if (data.productId) {
				workIds.push(data.productId);
			}
		}

		return workIds;
	} catch (error) {
		logger.error("既存作品ID取得エラー", {
			operation: "getExistingWorkIds",
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * 時系列データ収集の実行
 */
async function executeTimeseriesCollection(): Promise<{
	success: boolean;
	processedCount: number;
	error?: string;
}> {
	try {
		// 1. メタデータの準備と重複実行チェック
		const metadata = await getOrCreateTimeseriesMetadata();

		if (metadata.isInProgress) {
			logger.warn("時系列データ収集が既に実行中です", {
				operation: "executeTimeseriesCollection",
			});
			return { success: false, processedCount: 0, error: "前回の処理が完了していません" };
		}

		await updateTimeseriesMetadata({ isInProgress: true });

		// 2. 既存作品IDを取得
		const workIds = await getExistingWorkIds(50); // バッチサイズを50に制限

		if (workIds.length === 0) {
			logger.warn("処理対象の作品が見つかりません", {
				operation: "executeTimeseriesCollection",
			});
			await updateTimeseriesMetadata({ isInProgress: false });
			return { success: false, processedCount: 0, error: "処理対象の作品が見つかりません" };
		}

		logger.info("時系列データ収集開始", {
			operation: "executeTimeseriesCollection",
			workCount: workIds.length,
		});

		// 3. Individual Info API から現在のデータを取得
		const apiResponses = await fetchMultipleIndividualInfoAPI(workIds);

		if (apiResponses.length === 0) {
			logger.warn("Individual Info API からデータを取得できませんでした", {
				operation: "executeTimeseriesCollection",
			});
			await updateTimeseriesMetadata({ isInProgress: false });
			return { success: false, processedCount: 0, error: "APIからデータを取得できませんでした" };
		}

		// 4. 時系列データに変換
		const timeseriesData = mapMultipleIndividualInfoToTimeSeries(apiResponses);

		// 5. Firestoreに保存
		await saveMultipleTimeSeriesRawData(timeseriesData);

		// 6. メタデータ更新
		await updateTimeseriesMetadata({
			isInProgress: false,
			totalWorksProcessed: timeseriesData.length,
			lastError: undefined,
		});

		logger.info("時系列データ収集完了", {
			operation: "executeTimeseriesCollection",
			apiResponseCount: apiResponses.length,
			timeseriesDataCount: timeseriesData.length,
			processedWorkIds: timeseriesData.map((d) => d.workId),
		});

		return {
			success: true,
			processedCount: timeseriesData.length,
		};
	} catch (error) {
		logger.error("時系列データ収集エラー", {
			operation: "executeTimeseriesCollection",
			error: error instanceof Error ? error.message : String(error),
		});

		// エラー状態を記録
		try {
			await updateTimeseriesMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("メタデータエラー記録失敗", {
				operation: "executeTimeseriesCollection",
				updateError: updateError instanceof Error ? updateError.message : String(updateError),
			});
		}

		return {
			success: false,
			processedCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * 日次集計処理の実行
 */
async function executeDailyAggregation(): Promise<{
	success: boolean;
	processedDays: number;
	error?: string;
}> {
	try {
		logger.info("日次集計処理開始", {
			operation: "executeDailyAggregation",
		});

		// 過去3日分の日次集計を実行
		await batchProcessDailyAggregates(3);

		// メタデータ更新
		await updateTimeseriesMetadata({
			lastDailyAggregationAt: Timestamp.now(),
		});

		logger.info("日次集計処理完了", {
			operation: "executeDailyAggregation",
			processedDays: 3,
		});

		return {
			success: true,
			processedDays: 3,
		};
	} catch (error) {
		logger.error("日次集計処理エラー", {
			operation: "executeDailyAggregation",
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			processedDays: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * 期限切れデータクリーンアップの実行
 */
async function executeDataCleanup(): Promise<{
	success: boolean;
	deletedCount: number;
	error?: string;
}> {
	try {
		logger.info("期限切れデータクリーンアップ開始", {
			operation: "executeDataCleanup",
		});

		// 7日前より古い生データを削除
		const deletedCount = await deleteExpiredRawData();

		// メタデータ更新
		await updateTimeseriesMetadata({
			lastCleanupAt: Timestamp.now(),
		});

		logger.info("期限切れデータクリーンアップ完了", {
			operation: "executeDataCleanup",
			deletedCount,
		});

		return {
			success: true,
			deletedCount,
		};
	} catch (error) {
		logger.error("期限切れデータクリーンアップエラー", {
			operation: "executeDataCleanup",
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			deletedCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * DLsite時系列データ収集 Cloud Function エントリーポイント
 *
 * @deprecated このFunctionは統合アーキテクチャにより廃止予定です
 * 新システムでは fetchDLsiteWorksIndividualAPI が統合処理を実行します
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Deprecated function, complexity acceptable for legacy code
export const collectDLsiteTimeseries = async (event: CloudEvent<PubsubMessage>): Promise<void> => {
	logger.info("DLsite時系列データ収集開始", {
		operation: "collectDLsiteTimeseries",
		trigger: "pub-sub",
	});

	try {
		const message = event.data;

		// メッセージから処理タイプを判定
		let processType = "collection"; // デフォルトは通常の収集処理

		if (message?.attributes?.type) {
			processType = message.attributes.type;
		} else if (message?.data) {
			try {
				const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
				const messageData = JSON.parse(decodedData);
				processType = messageData.type || "collection";
			} catch (error) {
				logger.warn("メッセージデータの解析に失敗", {
					operation: "collectDLsiteTimeseries",
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		logger.info("処理タイプ決定", {
			operation: "collectDLsiteTimeseries",
			processType,
		});

		// 処理タイプに応じて実行
		switch (processType) {
			case "collection":
				{
					const result = await executeTimeseriesCollection();
					if (result.success) {
						logger.info("時系列データ収集完了", {
							operation: "collectDLsiteTimeseries",
							processedCount: result.processedCount,
						});
					} else {
						logger.error("時系列データ収集失敗", {
							operation: "collectDLsiteTimeseries",
							error: result.error,
						});
					}
				}
				break;

			case "aggregation":
				{
					const result = await executeDailyAggregation();
					if (result.success) {
						logger.info("日次集計処理完了", {
							operation: "collectDLsiteTimeseries",
							processedDays: result.processedDays,
						});
					} else {
						logger.error("日次集計処理失敗", {
							operation: "collectDLsiteTimeseries",
							error: result.error,
						});
					}
				}
				break;

			case "cleanup":
				{
					const result = await executeDataCleanup();
					if (result.success) {
						logger.info("期限切れデータクリーンアップ完了", {
							operation: "collectDLsiteTimeseries",
							deletedCount: result.deletedCount,
						});
					} else {
						logger.error("期限切れデータクリーンアップ失敗", {
							operation: "collectDLsiteTimeseries",
							error: result.error,
						});
					}
				}
				break;

			case "full":
				{
					// 全処理を順次実行
					const collectionResult = await executeTimeseriesCollection();
					const aggregationResult = await executeDailyAggregation();
					const cleanupResult = await executeDataCleanup();

					logger.info("時系列データ全処理完了", {
						operation: "collectDLsiteTimeseries",
						collectionSuccess: collectionResult.success,
						aggregationSuccess: aggregationResult.success,
						cleanupSuccess: cleanupResult.success,
						processedCount: collectionResult.processedCount,
						processedDays: aggregationResult.processedDays,
						deletedCount: cleanupResult.deletedCount,
					});
				}
				break;

			default:
				logger.warn("不明な処理タイプ", {
					operation: "collectDLsiteTimeseries",
					processType,
				});
				break;
		}

		logger.info("DLsite時系列データ収集完了", {
			operation: "collectDLsiteTimeseries",
			processType,
		});
	} catch (error) {
		logger.error("DLsite時系列データ収集でエラー発生", {
			operation: "collectDLsiteTimeseries",
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
