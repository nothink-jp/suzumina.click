/**
 * DLsite Individual Info API クライアント
 *
 * 重複していた Individual Info API 呼び出し処理を統合
 * DLsite固有のドメインロジックを含むため services/dlsite に配置
 */

import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import * as logger from "../../shared/logger";
import type { IndividualInfoAPIResponse } from "./individual-info-to-work-mapper";

// API設定
const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";

/**
 * Individual Info API リクエストオプション
 */
export interface IndividualInfoAPIOptions {
	/** 詳細ログ出力（開発環境用）（デフォルト: false） */
	enableDetailedLogging?: boolean;
}

/**
 * Individual Info APIから単一作品データを取得
 * 詳細エラーハンドリング付き
 *
 * @param workId - 作品ID (RJ形式)
 * @param options - API呼び出しオプション
 * @returns 作品データまたはnull（取得失敗時）
 */
export async function fetchIndividualWorkInfo(
	workId: string,
	options: IndividualInfoAPIOptions = {},
): Promise<IndividualInfoAPIResponse | null> {
	const { enableDetailedLogging = false } = options;

	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		if (enableDetailedLogging) {
			logger.info(`🔄 API取得開始: ${workId}`);
		}

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			const responseText = await response.text();
			const logContext = {
				workId,
				status: response.status,
				statusText: response.statusText,
				responseText: responseText.substring(0, 500),
				url,
			};

			if (enableDetailedLogging) {
				logger.warn(`❌ API取得失敗: ${workId}`, logContext);
			} else {
				logger.warn(`API request failed for ${workId}`, {
					...logContext,
					headers: Object.fromEntries(response.headers.entries()),
				});
			}

			// 404: 作品が見つからない
			if (response.status === 404) {
				logger.warn(`作品が見つかりません: ${workId}`);
				return null;
			}

			// 403: アクセス拒否
			if (response.status === 403) {
				logger.error(`Individual Info API アクセス拒否: ${workId} (Status: ${response.status})`);
				throw new Error(`API access denied for ${workId}`);
			}

			// その他のエラー
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const responseText = await response.text();
		let responseData: unknown;

		try {
			responseData = JSON.parse(responseText);
		} catch (jsonError) {
			const errorContext = {
				workId,
				responseText: responseText.substring(0, 1000),
				jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
				url,
			};

			if (enableDetailedLogging) {
				logger.error(`JSON parse error: ${workId}`, errorContext);
			} else {
				logger.error(`JSON parse error for ${workId}`, errorContext);
			}

			return null;
		}

		// Individual Info APIは配列形式でレスポンスを返す
		if (!Array.isArray(responseData) || responseData.length === 0) {
			const invalidContext = {
				workId,
				responseType: typeof responseData,
				isArray: Array.isArray(responseData),
				responseLength: Array.isArray(responseData) ? responseData.length : "N/A",
				url,
			};

			if (enableDetailedLogging) {
				logger.warn(`Invalid response: ${workId}`, invalidContext);
			} else {
				logger.warn(`Invalid API response for ${workId}: empty or non-array response`, {
					...invalidContext,
					responseData: responseData,
					responseText: responseText.substring(0, 1000),
				});
			}

			return null;
		}

		const data = responseData[0] as IndividualInfoAPIResponse;

		// 基本的なデータ検証
		if (!data.workno && !data.product_id) {
			logger.warn(`Invalid data: ${workId} - missing workno/product_id`);
			return null;
		}

		if (enableDetailedLogging) {
			logger.info(`✅ API取得成功: ${workId} (${data.work_name || "名前不明"})`);
		}

		return data;
	} catch (error) {
		if (enableDetailedLogging) {
			logger.error(`API取得エラー: ${workId}`, {
				error: error instanceof Error ? error.message : String(error),
			});
		} else {
			logger.error(`Individual Info API取得エラー: ${workId}`, { error });
		}

		throw error;
	}
}

/**
 * バッチでIndividual Info APIを呼び出し
 *
 * @param workIds - 作品IDの配列
 * @param options - API呼び出しオプション
 * @returns 取得結果と失敗作品IDのMap
 */
export async function batchFetchIndividualInfo(
	workIds: string[],
	options: IndividualInfoAPIOptions & {
		/** 最大並列数（デフォルト: 5） */
		maxConcurrent?: number;
		/** バッチ間隔（ms）（デフォルト: 800） */
		batchDelay?: number;
	} = {},
): Promise<{
	results: Map<string, IndividualInfoAPIResponse>;
	failedWorkIds: string[];
}> {
	const { maxConcurrent = 5, batchDelay = 800, ...apiOptions } = options;
	const results = new Map<string, IndividualInfoAPIResponse>();
	const failedWorkIds: string[] = [];

	// バッチに分割
	const batches: string[][] = [];
	for (let i = 0; i < workIds.length; i += maxConcurrent) {
		batches.push(workIds.slice(i, i + maxConcurrent));
	}

	for (const [batchIndex, batch] of batches.entries()) {
		try {
			// 並列でAPIを呼び出し
			const promises = batch.map(async (workId) => {
				try {
					const data = await fetchIndividualWorkInfo(workId, apiOptions);
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
				await new Promise((resolve) => setTimeout(resolve, batchDelay));
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
