/**
 * DLsite Individual Info API クライアント
 *
 * 重複していた Individual Info API 呼び出し処理を統合
 * DLsite固有のドメインロジックを含むため services/dlsite に配置
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import * as logger from "../../shared/logger";

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
 * HTTPレスポンスエラーを処理
 */
function handleHttpError(
	response: Response,
	workId: string,
	_url: string,
	_responseText: string,
	_enableDetailedLogging: boolean,
): DLsiteApiResponse | null {
	// 詳細ログは環境に関係なく省略

	// 404: 作品が見つからない（ログ省略）
	if (response.status === 404) {
		return null;
	}

	// 403: アクセス拒否
	if (response.status === 403) {
		logger.error(`Individual Info API アクセス拒否: ${workId} (Status: ${response.status})`);
		throw new Error(`API access denied for ${workId}`);
	}

	// 429: レート制限（リトライ可能）
	if (response.status === 429) {
		logger.warn(`Individual Info API レート制限: ${workId}`);
		throw new Error(`Rate limited for ${workId} - retry needed`);
	}

	// 5xx: サーバーエラー（リトライ可能）
	if (response.status >= 500) {
		logger.warn(`Individual Info API サーバーエラー: ${workId} (Status: ${response.status})`);
		throw new Error(`Server error for ${workId} - retry needed`);
	}

	// その他のエラー
	throw new Error(`API request failed: ${response.status} ${response.statusText}`);
}

/**
 * JSONレスポンスを解析
 */
function parseJsonResponse(
	responseText: string,
	workId: string,
	url: string,
	_enableDetailedLogging: boolean,
): unknown | null {
	try {
		return JSON.parse(responseText);
	} catch (jsonError) {
		const errorContext = {
			workId,
			responseText: responseText.substring(0, 1000),
			jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
			url,
		};

		// JSON parse errorは重要なため保持
		logger.error(`JSON parse error for ${workId}`, errorContext);

		return null;
	}
}

/**
 * レスポンスデータの形式を検証
 */
function validateResponseFormat(
	responseData: unknown,
	workId: string,
	url: string,
	responseText: string,
	_enableDetailedLogging: boolean,
): DLsiteApiResponse | null {
	// Individual Info APIは配列形式でレスポンスを返す
	if (!Array.isArray(responseData) || responseData.length === 0) {
		const invalidContext = {
			workId,
			responseType: typeof responseData,
			isArray: Array.isArray(responseData),
			responseLength: Array.isArray(responseData) ? responseData.length : "N/A",
			url,
		};

		// Invalid responseは重要なため保持
		logger.warn(`Invalid API response for ${workId}: empty or non-array response`, {
			...invalidContext,
			responseData: responseData,
			responseText: responseText.substring(0, 1000),
		});

		return null;
	}

	const data = responseData[0] as DLsiteApiResponse;

	// 基本的なデータ検証（ログ省略）
	if (!data.workno && !data.product_id) {
		return null;
	}

	return data;
}

/**
 * Individual Info APIから単一作品データを取得
 * 詳細エラーハンドリング付き（リトライ機能付き）
 *
 * @param workId - 作品ID (RJ形式)
 * @param options - API呼び出しオプション
 * @returns 作品データまたはnull（取得失敗時）
 */
export async function fetchIndividualWorkInfo(
	workId: string,
	options: IndividualInfoAPIOptions & { retryCount?: number } = {},
): Promise<DLsiteApiResponse | null> {
	const { enableDetailedLogging = false, retryCount = 0 } = options;
	const MAX_RETRIES = 2;

	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		// API取得開始ログは省略

		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(30000), // 30秒タイムアウト
		});

		if (!response.ok) {
			const responseText = await response.text();

			// エラーレスポンスの詳細をログ
			if (response.status !== 404) {
				logger.error(`API HTTP Error for ${workId}`, {
					status: response.status,
					statusText: response.statusText,
					responseText: responseText.substring(0, 200),
					url,
				});
			}

			return handleHttpError(response, workId, url, responseText, enableDetailedLogging);
		}

		const responseText = await response.text();
		const responseData = parseJsonResponse(responseText, workId, url, enableDetailedLogging);

		if (responseData === null) {
			return null;
		}

		const validatedData = validateResponseFormat(
			responseData,
			workId,
			url,
			responseText,
			enableDetailedLogging,
		);

		// API取得成功ログは省略

		return validatedData;
	} catch (error) {
		// リトライ可能なエラーかチェック
		if (
			error instanceof Error &&
			error.message.includes("retry needed") &&
			retryCount < MAX_RETRIES
		) {
			logger.warn(`リトライ実行 (${retryCount + 1}/${MAX_RETRIES}): ${workId}`);
			// エクスポネンシャルバックオフ
			await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
			return fetchIndividualWorkInfo(workId, {
				...options,
				retryCount: retryCount + 1,
			});
		}

		// API取得エラーは重要なため保持
		logger.error(`Individual Info API取得エラー: ${workId}`, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

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
		/** 最大並列数（デフォルト: 3） */
		maxConcurrent?: number;
		/** バッチ間隔（ms）（デフォルト: 800） */
		batchDelay?: number;
	} = {},
): Promise<{
	results: Map<string, DLsiteApiResponse>;
	failedWorkIds: string[];
}> {
	const { maxConcurrent = 3, batchDelay = 800, ...apiOptions } = options;
	const results = new Map<string, DLsiteApiResponse>();
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
				} catch (_error) {
					// 個別失敗ログは省略（バッチ単位で記録）
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
			logger.error(`バッチ ${batchIndex + 1} でエラー:`, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			// バッチ全体が失敗した場合、そのバッチの全作品IDを失敗として記録
			failedWorkIds.push(...batch);
		}
	}

	// 失敗が多い場合のみログ出力
	if (failedWorkIds.length > workIds.length * 0.1) {
		logger.warn(
			`API取得失敗が多数: ${failedWorkIds.length}件 (失敗率${((failedWorkIds.length / workIds.length) * 100).toFixed(1)}%)`,
		);
	}

	return { results, failedWorkIds };
}
