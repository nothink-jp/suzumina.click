/**
 * HTTP リクエスト関連のユーティリティ関数
 *
 * 複数のファイルで重複していたHTTPリクエスト処理ロジックを統合
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
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
export interface HttpResponse<T = any> {
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
 * 汎用HTTPリクエスト関数
 *
 * @param url - リクエストURL
 * @param options - リクエストオプション
 * @returns HTTPレスポンス
 */
export async function makeRequest<T = any>(
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
			const errorMessage = `HTTP ${response.status} ${response.statusText}`;

			if (enableDetailedLogging) {
				logger.warn(`❌ HTTPリクエスト失敗: ${url}`, {
					status: response.status,
					statusText: response.statusText,
				});
			}

			throw new HttpRequestError(errorMessage, response.status, response);
		}

		// レスポンスデータを取得
		let data: T;
		switch (responseType) {
			case "json":
				data = (await response.json()) as T;
				break;
			case "text":
				data = (await response.text()) as T;
				break;
			case "blob":
				data = (await response.blob()) as T;
				break;
			case "arrayBuffer":
				data = (await response.arrayBuffer()) as T;
				break;
			default:
				throw new Error(`Unsupported response type: ${responseType}`);
		}

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

		if (error instanceof HttpRequestError) {
			throw error;
		}

		// ネットワークエラー・タイムアウトエラーの処理
		if (error instanceof Error) {
			if (enableDetailedLogging) {
				logger.error(`HTTPリクエストエラー: ${url}`, {
					error: error.message,
				});
			}
		}

		throw new HttpRequestError(error instanceof Error ? error.message : String(error));
	}
}

/**
 * DLsite用のHTTPリクエスト（自動ヘッダー設定）
 *
 * @param url - リクエストURL
 * @param options - DLsite用リクエストオプション
 * @returns HTTPレスポンス
 */
export async function makeDLsiteRequest<T = any>(
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

/**
 * JSON POSTリクエストのヘルパー
 *
 * @param url - リクエストURL
 * @param data - POSTデータ
 * @param options - リクエストオプション
 * @returns HTTPレスポンス
 */
export async function postJson<T = any>(
	url: string,
	data: any,
	options: HttpRequestOptions = {},
): Promise<HttpResponse<T>> {
	return makeRequest<T>(url, {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		body: JSON.stringify(data),
	});
}

/**
 * URLクエリパラメータを構築
 *
 * @param params - パラメータオブジェクト
 * @returns URLSearchParams文字列
 */
export function buildQueryParams(params: Record<string, any>): string {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value !== null && value !== undefined) {
			searchParams.append(key, String(value));
		}
	}

	return searchParams.toString();
}

/**
 * URLとクエリパラメータを結合
 *
 * @param baseUrl - ベースURL
 * @param params - クエリパラメータ
 * @returns 完全なURL
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
	if (!params || Object.keys(params).length === 0) {
		return baseUrl;
	}

	const queryString = buildQueryParams(params);
	const separator = baseUrl.includes("?") ? "&" : "?";

	return `${baseUrl}${separator}${queryString}`;
}
