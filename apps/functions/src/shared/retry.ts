/**
 * APIリトライ関連のユーティリティ関数
 *
 * このモジュールは各種APIリクエストに対して、リトライ機能や
 * エラーハンドリングを提供するユーティリティを含みます。
 */

import * as logger from "./logger";

/**
 * APIエラーの基本的な型定義
 */
export interface ApiError {
	code?: number;
	message?: string;
}

/**
 * リトライ設定のオプション
 */
export interface RetryOptions {
	/** 最大リトライ回数 */
	maxAttempts?: number;
	/** リトライ間隔（ミリ秒） */
	delayMs?: number;
	/** リトライをスキップすべきエラーコード配列 */
	skipRetryCodes?: number[];
}

// デフォルト値
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 5000;

/**
 * 指定された時間だけ待機する関数
 *
 * @param ms - 待機するミリ秒
 * @returns Promise<void>
 */
export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * リトライ機能付きのAPI呼び出し関数
 *
 * @param apiCall - API呼び出し関数
 * @param options - リトライに関するオプション
 * @returns Promise<T> - API呼び出し結果
 */
export function retryApiCall<T>(apiCall: () => Promise<T>, options?: RetryOptions): Promise<T> {
	const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	const delayMs = options?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
	// YouTube APIクォータ超過エラーコードはデフォルトでスキップするように設定
	const skipRetryCodes = options?.skipRetryCodes ?? [403];

	return internalRetry(apiCall, maxAttempts, delayMs, skipRetryCodes);
}

/**
 * 内部リトライ処理の実装
 *
 * @param apiCall - API呼び出し関数
 * @param attemptsLeft - 残りリトライ回数
 * @param delayMs - リトライ間隔（ミリ秒）
 * @param skipRetryCodes - リトライをスキップすべきエラーコード配列
 * @returns Promise<T> - API呼び出し結果
 */
async function internalRetry<T>(
	apiCall: () => Promise<T>,
	attemptsLeft: number,
	delayMs: number,
	skipRetryCodes: number[],
): Promise<T> {
	try {
		return await apiCall();
	} catch (error: unknown) {
		// リトライ回数超過の場合は例外をスロー
		if (attemptsLeft <= 1) {
			throw error;
		}

		// APIエラーの型変換
		const apiError = error as ApiError;

		// 特定のエラーコードがリトライ対象から除外されている場合は即時例外をスロー
		if (apiError.code && skipRetryCodes.includes(apiError.code)) {
			throw error;
		}

		// リトライ処理
		logger.warn(
			`API呼び出しに失敗しました。${delayMs}ms後に再試行します。残りリトライ回数: ${attemptsLeft - 1}`,
		);

		// 待機してリトライ
		await sleep(delayMs);
		return internalRetry(apiCall, attemptsLeft - 1, delayMs, skipRetryCodes);
	}
}
