/**
 * HTTP リクエスト関連のユーティリティ関数
 *
 * 複数のファイルで重複していたHTTPリクエスト処理ロジックを統合
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import { errorMessage } from "./error-message";
import * as logger from "./logger";

/**
 * HTTPリクエストオプション
 */
export interface HttpRequestOptions {
	/** HTTPメソッド（デフォルト: GET） */
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	/** リクエストヘッダー */
	headers?: Record<string, string>;
	/** リクエストボディ */
	body?: string | FormData | URLSearchParams;
	/** タイムアウト（ms）（デフォルト: 30000） */
	timeout?: number;
	/** レスポンス形式（デフォルト: json） */
	responseType?: "json" | "text" | "blob" | "arrayBuffer";
	/** 詳細ログ出力（デフォルト: false） */
	enableDetailedLogging?: boolean;
}

/**
 * HTTPレスポンス型
 */
export interface HttpResponse<T = unknown> {
	data: T;
	status: number;
	statusText: string;
	headers: Headers;
	url: string;
}

/**
 * DLsite用のHTTPリクエストオプション
 */
export interface DLsiteRequestOptions extends Omit<HttpRequestOptions, "headers"> {
	/** 追加ヘッダー（DLsiteヘッダーに追加） */
	additionalHeaders?: Record<string, string>;
}

/**
 * HTTPリクエストエラー
 */
export class HttpRequestError extends Error {
	constructor(
		message: string,
		public status?: number,
		public response?: Response,
	) {
		super(message);
		this.name = "HttpRequestError";
	}
}

/**
 * レスポンスデータを解析
 */
async function parseResponseData<T>(response: Response, responseType: string): Promise<T> {
	switch (responseType) {
		case "json":
			return (await response.json()) as T;
		case "text":
			return (await response.text()) as T;
		case "blob":
			return (await response.blob()) as T;
		case "arrayBuffer":
			return (await response.arrayBuffer()) as T;
		default:
			throw new Error(`Unsupported response type: ${responseType}`);
	}
}

/**
 * HTTPエラーをハンドリング
 */
function handleHttpError(response: Response, url: string, enableDetailedLogging: boolean): never {
	const errorMessage = `HTTP ${response.status} ${response.statusText}`;

	if (enableDetailedLogging) {
		logger.warn(`❌ HTTPリクエスト失敗: ${url}`, {
			status: response.status,
			statusText: response.statusText,
		});
	}

	throw new HttpRequestError(errorMessage, response.status, response);
}

/**
 * ネットワークエラーをハンドリング
 */
function handleNetworkError(error: unknown, url: string, enableDetailedLogging: boolean): never {
	if (error instanceof HttpRequestError) {
		throw error;
	}

	if (error instanceof Error && enableDetailedLogging) {
		logger.error(`HTTPリクエストエラー: ${url}`, {
			error: error.message,
		});
	}

	throw new HttpRequestError(errorMessage(error));
}

/**
 * 汎用HTTPリクエスト関数
 *
 * @param url - リクエストURL
 * @param options - リクエストオプション
 * @returns HTTPレスポンス
 */
export async function makeRequest<T = unknown>(
	url: string,
	options: HttpRequestOptions = {},
): Promise<HttpResponse<T>> {
	const {
		method = "GET",
		headers = {},
		body,
		timeout = 30000,
		responseType = "json",
		enableDetailedLogging = false,
	} = options;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		if (enableDetailedLogging) {
			logger.debug(`🔄 HTTP ${method} リクエスト: ${url}`);
		}

		const response = await fetch(url, {
			method,
			headers,
			body,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			handleHttpError(response, url, enableDetailedLogging);
		}

		const data = await parseResponseData<T>(response, responseType);

		if (enableDetailedLogging) {
			logger.debug(`✅ HTTPリクエスト成功: ${url}`);
		}

		return {
			data,
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
			url: response.url,
		};
	} catch (error) {
		clearTimeout(timeoutId);
		handleNetworkError(error, url, enableDetailedLogging);
	}
}

/**
 * DLsite用のHTTPリクエスト（自動ヘッダー設定）
 *
 * @param url - リクエストURL
 * @param options - DLsite用リクエストオプション
 * @returns HTTPレスポンス
 */
export async function makeDLsiteRequest<T = unknown>(
	url: string,
	options: DLsiteRequestOptions = {},
): Promise<HttpResponse<T>> {
	const { additionalHeaders = {}, ...restOptions } = options;

	// DLsiteヘッダーを生成して追加ヘッダーとマージ
	const dlsiteHeaders = generateDLsiteHeaders();
	const headers = {
		...dlsiteHeaders,
		...additionalHeaders,
	};

	return makeRequest<T>(url, {
		...restOptions,
		headers,
	});
}
