/**
 * Cloud Run Functions用ロガー
 *
 * このモジュールはCloud Run Functionsに最適化された構造化ログ出力を提供します。
 * Cloud Run Functionsでは標準出力への構造化ログが自動的にCloud Loggingに転送されます。
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
 * コンソール形式用の追加情報をフォーマット
 */
function formatConsoleAdditionalInfo(optionsOrError: unknown): string {
	if (!optionsOrError) {
		return "";
	}

	if (optionsOrError instanceof Error) {
		let errorInfo = `\n  Error: ${optionsOrError.message}`;
		if (optionsOrError.stack) {
			errorInfo += `\n  Stack: ${optionsOrError.stack}`;
		}
		return errorInfo;
	}

	if (typeof optionsOrError === "object" && optionsOrError !== null) {
		const formatted = JSON.stringify(optionsOrError, null, 2);
		return `\n  Data: ${formatted}`;
	}

	return "";
}

/**
 * コンソール形式でログを出力
 */
function logToConsole(
	level: LogLevel,
	message: string,
	optionsOrError?: LogOptions | unknown,
): void {
	const timestamp = new Date().toISOString();
	const levelIcon = getLevelIcon(level);

	let logLine = `${timestamp} ${levelIcon} ${level} ${message}`;
	logLine += formatConsoleAdditionalInfo(optionsOrError);

	// biome-ignore lint/suspicious/noConsole: コンソール形式ログ出力
	console.log(logLine);
}

/**
 * Cloud Functions v2の実行情報を取得
 */
function getCloudFunctionsLabels(): Record<string, unknown> | undefined {
	if (!process.env.K_SERVICE) {
		return undefined;
	}

	return {
		"logging.googleapis.com/labels": {
			service: process.env.K_SERVICE,
			...(process.env.K_REVISION && { revision: process.env.K_REVISION }),
			...(process.env.K_CONFIGURATION && { configuration: process.env.K_CONFIGURATION }),
		},
	};
}

/**
 * 構造化ログエントリにオプションまたはエラーを追加
 */
function addOptionsToLogEntry(
	logEntry: Record<string, unknown>,
	optionsOrError?: LogOptions | unknown,
): void {
	if (!optionsOrError) {
		return;
	}

	if (optionsOrError instanceof Error) {
		logEntry.error = {
			message: optionsOrError.message,
			name: optionsOrError.name,
			stack: optionsOrError.stack,
		};
	} else {
		Object.assign(logEntry, optionsOrError);
	}
}

/**
 * 構造化ログ形式でログを出力
 */
function logStructured(
	level: LogLevel,
	message: string,
	optionsOrError?: LogOptions | unknown,
): void {
	const logEntry: Record<string, unknown> = {
		severity: level,
		message,
	};

	// Cloud Functions v2の実行情報を追加
	const cloudFunctionsLabels = getCloudFunctionsLabels();
	if (cloudFunctionsLabels) {
		Object.assign(logEntry, cloudFunctionsLabels);
	}

	// オプションまたはエラーを追加
	addOptionsToLogEntry(logEntry, optionsOrError);

	// biome-ignore lint/suspicious/noConsole: Cloud Loggingへの転送にconsole.logが必要
	console.log(JSON.stringify(logEntry));
}

/**
 * ログを標準出力に送信する基本関数
 * 環境変数 LOG_FORMAT=console でコンソール用の読みやすい形式に変更可能
 * Cloud Run Functionsでは標準出力が自動的にCloud Loggingに転送される
 *
 * @param level - ログレベル（Cloud Logging標準）
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
function logMessage(level: LogLevel, message: string, optionsOrError?: LogOptions | unknown): void {
	const useConsoleFormat = process.env.LOG_FORMAT === "console";

	if (useConsoleFormat) {
		logToConsole(level, message, optionsOrError);
	} else {
		logStructured(level, message, optionsOrError);
	}
}

/**
 * ログレベルに対応するアイコンを取得
 */
function getLevelIcon(level: LogLevel): string {
	switch (level) {
		case LogLevel.DEBUG:
			return "🔍";
		case LogLevel.INFO:
			return "ℹ️";
		case LogLevel.WARN:
			return "⚠️";
		case LogLevel.ERROR:
			return "❌";
		default:
			return "📝";
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
