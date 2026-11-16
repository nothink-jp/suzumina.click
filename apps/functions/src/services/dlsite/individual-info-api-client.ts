/**
 * DLsite Individual Info API クライアント
 *
 * 重複していた Individual Info API 呼び出し処理を統合
 * DLsite固有のドメインロジックを含むため services/dlsite に配置
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import * as logger from "../../shared/logger";
import { recordSchemaDriftForBatch } from "./schema-drift";

// API設定
const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";
// タイムアウトを 30 秒から詰めているのは、リトライ1回分を足しても1作品あたりの
// 最悪待ち時間（15s + backoff 1s + 15s = 31s）が従来の 30s から増えないようにするため。
// サブバッチを直列に回すので、1作品の最悪値がそのまま run の実行時間に効く
// （並列数・間隔・実行時間制限の正本は endpoints/dlsite/process-batch.ts）。
// 実測レイテンシは 0.08〜0.37 秒（2026-08-22・タイムアウトした作品で計測）＝15 秒でも 40 倍以上の余裕がある。
const REQUEST_TIMEOUT_MS = 15000;

// リトライ上限はエラーの「1回あたりのコスト」で分ける。
// 5xx は即座にレスポンスが返るため2回まで許容できるが、タイムアウトは1回で
// REQUEST_TIMEOUT_MS を丸ごと消費するため1回に抑える。
// 429 はリトライしない（DLsiteRateLimitError 参照）。
const MAX_RETRIES_HTTP = 2;
const MAX_RETRIES_TIMEOUT = 1;

/**
 * リトライ前の待ち時間（`retryCount` は 0 始まり＝1回目のリトライ前は 1秒、2回目は 2秒）
 *
 * `fetchIndividualWorkInfo` の待ちと `WORST_CASE_FETCH_MS` の両方がこれを使う。
 */
function retryBackoffMs(retryCount: number): number {
	return (retryCount + 1) * 1000;
}

/**
 * 1作品の取得が最悪どれだけ掛かるか（リトライと待ちを含む）
 *
 * 毎回タイムアウト間際に 5xx が返る経路が最長: 試行は `MAX_RETRIES_HTTP + 1` 回で、その間に
 * `MAX_RETRIES_HTTP` 回の待ちが入る。サブバッチは並列なので、サブバッチ1回の最悪もこの値になる。
 * `batchFetchIndividualInfo` の `deadlineAt` の判定に使う（SPR-319）。
 * タイムアウト・リトライ回数・待ち時間（`retryBackoffMs`）を変えると、この値も追従する。
 */
export const WORST_CASE_FETCH_MS =
	REQUEST_TIMEOUT_MS * (MAX_RETRIES_HTTP + 1) +
	Array.from({ length: MAX_RETRIES_HTTP }, (_, retryCount) => retryBackoffMs(retryCount)).reduce(
		(total, ms) => total + ms,
		0,
	);

/**
 * 429（レート制限）を呼び出し元へ伝えるエラー
 *
 * リトライ対象にしない。DLsite の制限は一度掛かると約5分続き、その間 1〜2 秒後の再試行は
 * すべて 429 で返る（2026-11-13 実測・SPR-408）。再試行は制限中の負荷を増やすだけなので、
 * `batchFetchIndividualInfo` が残りを打ち切って次の run に回す。
 */
export class DLsiteRateLimitError extends Error {
	override readonly name = "DLsiteRateLimitError";

	constructor(
		workId: string,
		/** Retry-After ヘッダの秒数（ヘッダが無い・解釈できない場合は undefined） */
		readonly retryAfterSeconds?: number,
	) {
		super(`Rate limited for ${workId}`);
	}
}

/**
 * Retry-After ヘッダを秒数に直す（秒数表記と HTTP 日付表記の両方を受ける）
 */
function parseRetryAfterSeconds(value: string | null): number | undefined {
	if (!value) {
		return undefined;
	}
	const seconds = Number(value);
	if (Number.isFinite(seconds)) {
		return Math.max(0, seconds);
	}
	const date = Date.parse(value);
	return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/**
 * 制限・ブロックの種類を実測するために残す応答ヘッダ（SPR-408 / SPR-423）
 *
 * 全ヘッダは残さない（set-cookie 等を巻き込まない）。制限の種類と解除時刻、応答の出どころ
 * （Cloudflare か DLsite か）が読めるものだけ。
 */
function pickDiagnosticHeaders(headers: Headers): Record<string, string> {
	const picked: Record<string, string> = {};
	headers.forEach((value, key) => {
		if (
			key === "retry-after" ||
			key === "server" ||
			key === "content-type" ||
			/^(x-)?ratelimit|^cf-/.test(key)
		) {
			picked[key] = value;
		}
	});
	return picked;
}

/**
 * 作品ごとのログを出さずに `null` で返した失敗の記録（SPR-423）
 *
 * 404 と「workno / product_id の無い応答」は、販売終了作品で平常時にも起きるため作品ごとのログを
 * 出していない。その結果、この2経路で大半が失敗したときに理由が一切残らなかった（2026-11-16）。
 * 作品ごとには出さず、`batchFetchIndividualInfo` がバッチ単位で集計して WARN に出す。
 */
export interface SilentFetchFailure {
	workId: string;
	reason: "http_404" | "missing_workno";
	status: number;
	/** 制限・ブロックの種類を読むための応答ヘッダ（`pickDiagnosticHeaders`） */
	headers: Record<string, string>;
	/** 応答本文の先頭（Cloudflare のブロックページか DLsite の応答かを見分ける） */
	bodyHead: string;
}

/** バッチ WARN に載せるサンプルの上限と、本文の先頭として残す長さ */
const SILENT_FAILURE_SAMPLE_LIMIT = 3;
const SILENT_FAILURE_BODY_HEAD_LENGTH = 300;

/**
 * Individual Info API リクエストオプション
 */
export interface IndividualInfoAPIOptions {
	/** 詳細ログ出力（開発環境用）（デフォルト: false） */
	enableDetailedLogging?: boolean;
	/**
	 * ログを出さずに `null` で返した失敗を積む先。渡したときだけ記録する
	 * （`batchFetchIndividualInfo` が渡してバッチ単位で WARN に出す）。
	 */
	silentFailureSink?: SilentFetchFailure[];
}

function recordSilentFailure(
	sink: SilentFetchFailure[] | undefined,
	workId: string,
	reason: SilentFetchFailure["reason"],
	response: Response,
	responseText: string,
): void {
	sink?.push({
		workId,
		reason,
		status: response.status,
		headers: pickDiagnosticHeaders(response.headers),
		bodyHead: responseText.substring(0, SILENT_FAILURE_BODY_HEAD_LENGTH),
	});
}

/**
 * ログを出さずに失敗した分をバッチ単位で WARN に出す（SPR-423）
 *
 * 監視の契約ログではない（アラートのフィルタ対象は `warnIfFailureRateHigh` の文言）。
 * 原因調査のための診断ログ。
 */
function warnSilentFailures(silentFailures: SilentFetchFailure[], attemptedCount: number): void {
	if (silentFailures.length === 0) {
		return;
	}
	const count = (reason: SilentFetchFailure["reason"]) =>
		silentFailures.filter((failure) => failure.reason === reason).length;
	logger.warn(`ログ省略の取得失敗の内訳: ${silentFailures.length}件`, {
		attemptedCount,
		http404Count: count("http_404"),
		missingWorknoCount: count("missing_workno"),
		samples: silentFailures.slice(0, SILENT_FAILURE_SAMPLE_LIMIT),
	});
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

	// 429: レート制限（リトライしない＝DLsiteRateLimitError 参照）
	if (response.status === 429) {
		logger.warn(`Individual Info API レート制限: ${workId}`, {
			rateLimitHeaders: pickDiagnosticHeaders(response.headers),
		});
		throw new DLsiteRateLimitError(
			workId,
			parseRetryAfterSeconds(response.headers.get("retry-after")),
		);
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
			jsonError,
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
 * エラー種別ごとのリトライ上限を返す（0 = リトライしない）
 *
 * タイムアウトは一過性のネットワーク遅延が主因でリトライが最も効くクラス。
 * fetch は AbortSignal.timeout() 由来だと "TimeoutError" を投げる（"AbortError" は
 * AbortController.abort() 由来）ので、dlsite-ajax-fetcher と同じく両方を見る。
 */
function getMaxRetries(error: unknown): number {
	if (!(error instanceof Error)) {
		return 0;
	}

	// 5xx は handleHttpError が "retry needed" を付けて投げる
	if (error.message.includes("retry needed")) {
		return MAX_RETRIES_HTTP;
	}

	if (error.name === "TimeoutError" || error.name === "AbortError") {
		return MAX_RETRIES_TIMEOUT;
	}

	return 0;
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
	const { enableDetailedLogging = false, retryCount = 0, silentFailureSink } = options;

	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		// API取得開始ログは省略

		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
			} else {
				recordSilentFailure(silentFailureSink, workId, "http_404", response, responseText);
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

		// 配列で中身はあるのに workno / product_id が無い応答（validateResponseFormat がログ無しで null）
		if (validatedData === null && Array.isArray(responseData) && responseData.length > 0) {
			recordSilentFailure(silentFailureSink, workId, "missing_workno", response, responseText);
		}

		return validatedData;
	} catch (error) {
		// リトライ可能なエラーかチェック
		const maxRetries = getMaxRetries(error);
		if (maxRetries > 0 && retryCount < maxRetries) {
			logger.warn(`リトライ実行 (${retryCount + 1}/${maxRetries}): ${workId}`);
			await new Promise((resolve) => setTimeout(resolve, retryBackoffMs(retryCount)));
			return fetchIndividualWorkInfo(workId, {
				...options,
				retryCount: retryCount + 1,
			});
		}

		// API取得エラーは重要なため保持
		logger.error(`Individual Info API取得エラー: ${workId}`, {
			error,
		});

		throw error;
	}
}

/**
 * 失敗率が 10% を超えたら集約 WARN を出す（部分劣化アラートの契約ログ）
 *
 * @param attemptedCount 実際に呼んで結果が出た件数。429 で打ち切った分は含めない
 *   （含めると失敗率が薄まり、打ち切り前に起きた部分劣化を見逃す）
 */
function warnIfFailureRateHigh(failedCount: number, attemptedCount: number): void {
	if (failedCount > attemptedCount * 0.1) {
		logger.warn(
			`API取得失敗が多数: ${failedCount}件 (失敗率${((failedCount / attemptedCount) * 100).toFixed(1)}%)`,
		);
	}
}

/**
 * `batchFetchIndividualInfo` が途中で打ち切ったときの情報
 *
 * どちらの理由でも意味は同じ: **このバッチは未完了**。`skippedWorkIds` は results にも
 * failedWorkIds にも入らない（失敗ではない）ので、呼び出し側が次の run でやり直す。
 *
 * - `rate_limit`: 429 を受けた（SPR-408）。`skippedWorkIds` は 429 を受けた分 + 未着手分
 * - `deadline`: 次のサブバッチが `deadlineAt` までに終わる保証が無い（SPR-319）。
 *   `skippedWorkIds` は未着手分
 */
export type BatchInterruption =
	| {
			reason: "rate_limit";
			/** Retry-After ヘッダの秒数（無ければ undefined） */
			retryAfterSeconds?: number;
			skippedWorkIds: string[];
	  }
	| { reason: "deadline"; skippedWorkIds: string[] };

interface FetchOutcome {
	workId: string;
	data: DLsiteApiResponse | null;
	rateLimitError?: DLsiteRateLimitError;
}

/**
 * 1作品を取得し、例外を投げずに結果へ畳む（個別失敗ログは省略＝バッチ単位で記録）
 */
async function fetchOutcome(
	workId: string,
	apiOptions: IndividualInfoAPIOptions,
): Promise<FetchOutcome> {
	try {
		return { workId, data: await fetchIndividualWorkInfo(workId, apiOptions) };
	} catch (error) {
		return {
			workId,
			data: null,
			rateLimitError: error instanceof DLsiteRateLimitError ? error : undefined,
		};
	}
}

/**
 * サブバッチの結果を成功（results）と失敗（failedWorkIds）に振り分け、429 を受けた分を返す
 *
 * 429 を受けた分は失敗に数えない（次の run でやり直すため）。
 */
function classifyOutcomes(
	outcomes: FetchOutcome[],
	results: Map<string, DLsiteApiResponse>,
	failedWorkIds: string[],
): FetchOutcome[] {
	for (const { workId, data, rateLimitError } of outcomes) {
		if (data) {
			results.set(workId, data);
		} else if (!rateLimitError) {
			failedWorkIds.push(workId);
		}
	}
	return outcomes.filter((outcome) => outcome.rateLimitError);
}

function toRateLimitInterruption(
	rateLimited: FetchOutcome[],
	unattemptedWorkIds: string[],
): BatchInterruption {
	return {
		reason: "rate_limit",
		retryAfterSeconds: rateLimited
			.map((r) => r.rateLimitError?.retryAfterSeconds)
			.find((seconds) => seconds !== undefined),
		skippedWorkIds: [...rateLimited.map((r) => r.workId), ...unattemptedWorkIds],
	};
}

/**
 * バッチでIndividual Info APIを呼び出し
 *
 * 次のどちらかで打ち切り、`interruption` を返す（残りは呼ばない）:
 * - 429 を1件でも受けた（そのサブバッチで打ち切る）
 * - `deadlineAt` が指定されていて、次のサブバッチが最悪ケース（`WORST_CASE_FETCH_MS`）でも
 *   それまでに終わる保証が無い（始める前に打ち切る）
 *
 * @param workIds - 作品IDの配列
 * @param options - API呼び出しオプション
 * @returns 取得結果・失敗作品ID・打ち切った場合はその情報
 */
export async function batchFetchIndividualInfo(
	workIds: string[],
	options: IndividualInfoAPIOptions & {
		/** 最大並列数（デフォルト: 3） */
		maxConcurrent?: number;
		/** バッチ間隔（ms）（デフォルト: 800） */
		batchDelay?: number;
		/**
		 * この時刻（epoch ms）を過ぎて終わりうるサブバッチは始めない。省略時は時間で打ち切らない。
		 * 関数の timeout を超えて走り続けるのを防ぐためのもの（SPR-319）。
		 */
		deadlineAt?: number;
	} = {},
): Promise<{
	results: Map<string, DLsiteApiResponse>;
	failedWorkIds: string[];
	interruption?: BatchInterruption;
}> {
	const { maxConcurrent = 3, batchDelay = 800, deadlineAt, ...callerApiOptions } = options;
	const silentFailures: SilentFetchFailure[] = [];
	const apiOptions = { ...callerApiOptions, silentFailureSink: silentFailures };
	const results = new Map<string, DLsiteApiResponse>();
	const failedWorkIds: string[] = [];
	let interruption: BatchInterruption | undefined;

	// バッチに分割
	const batches: string[][] = [];
	for (let i = 0; i < workIds.length; i += maxConcurrent) {
		batches.push(workIds.slice(i, i + maxConcurrent));
	}

	for (const [batchIndex, batch] of batches.entries()) {
		if (deadlineAt !== undefined && Date.now() + WORST_CASE_FETCH_MS > deadlineAt) {
			interruption = { reason: "deadline", skippedWorkIds: batches.slice(batchIndex).flat() };
			break;
		}

		const outcomes = await Promise.all(batch.map((workId) => fetchOutcome(workId, apiOptions)));
		const rateLimited = classifyOutcomes(outcomes, results, failedWorkIds);
		if (rateLimited.length > 0) {
			interruption = toRateLimitInterruption(rateLimited, batches.slice(batchIndex + 1).flat());
			break;
		}

		// レート制限対応
		if (batchIndex < batches.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, batchDelay));
		}
	}

	const attemptedCount = workIds.length - (interruption?.skippedWorkIds.length ?? 0);
	warnIfFailureRateHigh(failedWorkIds.length, attemptedCount);
	warnSilentFailures(silentFailures, attemptedCount);

	// スキーマドリフト観測（SPR-140）: 既知集合に無い新フィールドが出たら WARN（重複抑制・例外は無視）
	recordSchemaDriftForBatch(
		Array.from(results.values()) as unknown as Array<Record<string, unknown>>,
		{ batchSize: workIds.length },
	);

	return { results, failedWorkIds, interruption };
}
