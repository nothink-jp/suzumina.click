/**
 * Next.js Web App用ロガー
 *
 * Cloud Runでは標準出力への構造化ログが自動的にCloud Loggingに転送されます。
 */

// ログレベルの定義（Cloud Loggingの標準に準拠）
export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARNING",
	ERROR = "ERROR",
}

// ログオプションのインターフェース
interface LogOptions {
	// 追加のメタデータ
	[key: string]: unknown;
}

/**
 * オブジェクトの列挙可能な自前プロパティのうち、プリミティブ値だけを写す
 *
 * オブジェクト値は写さない: GaxiosError の `config` は `params.key`（API キー）を含み、
 * `response` は巨大・循環参照になり得るため。bigint は JSON.stringify が throw するので除く。
 */
function pickPrimitiveProps(obj: object): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(obj).filter(
			([, value]) => value === null || (typeof value !== "object" && typeof value !== "bigint"),
		),
	);
}

/**
 * Error を JSON 化できる形に展開する
 *
 * Error の message / stack は列挙不可のため、そのまま JSON.stringify すると `{}` に潰れる。
 * 独自プロパティ（Firestore / gRPC の `code` 等）はプリミティブ値だけ残し、`cause` は Error のときだけ
 * replacer の再帰で展開される。規則は functions の logger と同じ（SPR-347 / SPR-383）。
 */
function serializeError(error: Error): Record<string, unknown> {
	return {
		...pickPrimitiveProps(error),
		message: error.message,
		name: error.name,
		stack: error.stack,
		...(error.cause instanceof Error && { cause: error.cause }),
	};
}

/**
 * JSON.stringify 用 replacer。payload のどの深さにある Error も {@link serializeError} で展開する（functions と同じ）
 */
function errorReplacer(_key: string, value: unknown): unknown {
	return value instanceof Error ? serializeError(value) : value;
}

/**
 * 基本的なログエントリを作成
 */
function createBaseLogEntry(level: LogLevel, message: string): Record<string, unknown> {
	return {
		severity: level,
		message,
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV,
	};
}

/**
 * 第 2 引数を payload オブジェクトに正規化する（Error やプリミティブは `error` キーに入れる）
 *
 * web だけの規則: **トップレベルの** `error` が Error 以外のオブジェクト（throw された素のオブジェクト等）なら、
 * Error と同じ理由でプリミティブ値だけを残す。ネストした `error` キー（外部 API レスポンス等）は触らない。
 */
function toPayload(optionsOrError: unknown): Record<string, unknown> {
	if (optionsOrError === undefined || optionsOrError === null) return {};
	if (optionsOrError instanceof Error || typeof optionsOrError !== "object") {
		return { error: optionsOrError };
	}
	const payload = optionsOrError as Record<string, unknown>;
	const { error } = payload;
	if (
		error !== null &&
		typeof error === "object" &&
		!(error instanceof Error) &&
		!Array.isArray(error)
	) {
		return { ...payload, error: pickPrimitiveProps(error) };
	}
	return payload;
}

/**
 * ログエントリを JSON 化する。循環参照・bigint で throw した場合は基本フィールドだけを出す
 *
 * catch 節の中で logger が throw すると元のエラーが別の例外で隠れるため、logger からは例外を出さない。
 */
function serializeLogEntry(
	logEntry: Record<string, unknown>,
	baseEntry: Record<string, unknown>,
): string {
	try {
		return JSON.stringify(logEntry, errorReplacer);
	} catch (serializationError) {
		return JSON.stringify({
			...baseEntry,
			log_serialization_error: String(serializationError),
		});
	}
}

/**
 * 構造化ログを標準出力に送信する基本関数
 * Cloud Runでは標準出力が自動的にCloud Loggingに転送される
 *
 * `severity` / `message` などの基本フィールドは log-based メトリクス・アラートのフィルタ対象（監視の契約）なので、
 * payload に同名キーがあっても logger の値で上書きし直す（payload 側の値は捨てる）。呼び出し元の payload は変更しない。
 *
 * @param level - ログレベル（Cloud Logging標準）
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
function logMessage(level: LogLevel, message: string, optionsOrError?: LogOptions | unknown): void {
	const baseEntry = createBaseLogEntry(level, message);
	const logEntry = { ...baseEntry, ...toPayload(optionsOrError), ...baseEntry };

	writeLogEntry(serializeLogEntry(logEntry, baseEntry));
}

/**
 * シリアライズ済みのログエントリを console に書き出す
 * 本番は Cloud Logging が拾う 1 行 JSON、開発は読みやすい形式
 */
function writeLogEntry(serializedEntry: string): void {
	if (process.env.NODE_ENV === "production") {
		// ブラウザの console は Cloud Logging に届かず、閲覧者に内部情報を見せるだけなので出さない
		if (typeof window !== "undefined") return;
		// biome-ignore lint/suspicious/noConsole: Cloud Loggingとの統合に必要
		console.log(serializedEntry);
	} else {
		// 開発環境では読みやすい形式で出力
		const {
			severity,
			message: msg,
			...rest
		} = JSON.parse(serializedEntry) as Record<string, unknown>;
		const logMethod =
			severity === LogLevel.ERROR ? "error" : severity === LogLevel.WARN ? "warn" : "log";
		// biome-ignore lint/suspicious/noConsole: 開発環境でのデバッグ用
		console[logMethod](`[${severity}] ${msg}`, rest);
	}
}

/**
 * デバッグレベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function debug(message: string, options?: LogOptions): void {
	logMessage(LogLevel.DEBUG, message, options);
}

/**
 * 情報レベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function info(message: string, options?: LogOptions): void {
	logMessage(LogLevel.INFO, message, options);
}

/**
 * 警告レベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function warn(message: string, options?: LogOptions): void {
	logMessage(LogLevel.WARN, message, options);
}

/**
 * エラーレベルのログを出力
 *
 * @param message - ログメッセージ
 * @param errorOrOptions - エラーオブジェクトまたは追加のメタデータ
 */
export function error(message: string, errorOrOptions?: unknown): void {
	logMessage(LogLevel.ERROR, message, errorOrOptions);
}
