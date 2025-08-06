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

// エラーオブジェクトの型定義
interface SerializableError {
	message: string;
	name?: string;
	stack?: string;
	code?: string;
	details?: Record<string, unknown>;
}

// 未知のエラーオブジェクトの型定義
interface UnknownErrorObject {
	message?: unknown;
	code?: unknown;
	details?: unknown;
}

/**
 * Errorオブジェクトをシリアライズ可能な形式に変換
 */
function serializeError(error: Error): SerializableError {
	return {
		message: error.message,
		name: error.name,
		stack: error.stack,
	};
}

/**
 * 未知のエラーオブジェクトをシリアライズ可能な形式に変換
 */
function serializeUnknownError(errorObj: UnknownErrorObject): SerializableError {
	try {
		const result: SerializableError = {
			message: typeof errorObj.message === "string" ? errorObj.message : "Unknown error",
			code: typeof errorObj.code === "string" ? errorObj.code : "UNKNOWN",
		};

		// details フィールドを安全に追加
		if (errorObj.details && typeof errorObj.details === "object") {
			result.details = errorObj.details as Record<string, unknown>;
		}

		return result;
	} catch {
		return {
			message: "Error serialization failed",
		};
	}
}

/**
 * エラーが含まれるオブジェクトを処理
 */
function processErrorObject(optionsOrError: Record<string, unknown>): Record<string, unknown> {
	const errorObj = optionsOrError.error;

	if (errorObj instanceof Error) {
		optionsOrError.error = serializeError(errorObj);
	} else if (errorObj && typeof errorObj === "object") {
		optionsOrError.error = serializeUnknownError(errorObj as UnknownErrorObject);
	}

	return optionsOrError;
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
		...(process.env.VERCEL_URL && { vercelUrl: process.env.VERCEL_URL }),
	};
}

/**
 * 構造化ログを標準出力に送信する基本関数
 * Cloud Runでは標準出力が自動的にCloud Loggingに転送される
 *
 * @param level - ログレベル（Cloud Logging標準）
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
function logMessage(level: LogLevel, message: string, optionsOrError?: LogOptions | unknown): void {
	const logEntry = createBaseLogEntry(level, message);

	if (optionsOrError) {
		if (optionsOrError instanceof Error) {
			logEntry.error = serializeError(optionsOrError);
		} else if (optionsOrError && typeof optionsOrError === "object" && "error" in optionsOrError) {
			const processedOptions = processErrorObject(optionsOrError as Record<string, unknown>);
			Object.assign(logEntry, processedOptions);
		} else {
			Object.assign(logEntry, optionsOrError);
		}
	}

	// 本番環境では構造化ログを出力（Cloud Runが自動的にCloud Loggingに転送）
	// 開発環境では読みやすい形式で出力
	if (process.env.NODE_ENV === "production") {
		// biome-ignore lint/suspicious/noConsole: Cloud Loggingとの統合に必要
		console.log(JSON.stringify(logEntry));
	} else {
		// 開発環境では読みやすい形式で出力
		const { severity, message: msg, ...rest } = logEntry;
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
