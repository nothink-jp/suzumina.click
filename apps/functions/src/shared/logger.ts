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
 * Error を JSON 化できる形に展開する
 *
 * Error の message / stack は列挙不可のため、そのまま JSON.stringify すると `{}` に潰れる（SPR-347）。
 * 列挙可能な独自プロパティは**プリミティブ値だけ**残す（Firestore / gRPC の `code` 等）。
 * オブジェクト値は写さない: GaxiosError の `config` は `params.key`（YouTube API キー）を含み、
 * `response` は巨大・循環参照になり得るため。`cause` は Error のときだけ replacer の再帰で展開される。
 */
function serializeError(error: Error): Record<string, unknown> {
	const primitiveProps = Object.fromEntries(
		Object.entries(error).filter(([, value]) => value === null || typeof value !== "object"),
	);
	return {
		...primitiveProps,
		message: error.message,
		name: error.name,
		stack: error.stack,
		...(error.cause instanceof Error && { cause: error.cause }),
	};
}

/**
 * JSON.stringify 用 replacer。payload のどの深さにある Error も {@link serializeError} で展開する
 */
function errorReplacer(_key: string, value: unknown): unknown {
	return value instanceof Error ? serializeError(value) : value;
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
		const formatted = JSON.stringify(optionsOrError, errorReplacer, 2);
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
		logEntry.error = optionsOrError;
	} else {
		Object.assign(logEntry, optionsOrError);
	}
}

/**
 * 構造化ログ形式でログを出力
 *
 * `severity` / `message` / labels は log-based メトリクス・アラートのフィルタ対象（監視の契約）なので、
 * payload に同名キーがあっても logger の値で上書きし直す（payload 側の値は捨てる）。
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
	const cloudFunctionsLabels = getCloudFunctionsLabels();

	addOptionsToLogEntry(logEntry, optionsOrError);

	logEntry.severity = level;
	logEntry.message = message;
	if (cloudFunctionsLabels) {
		Object.assign(logEntry, cloudFunctionsLabels);
	}

	// biome-ignore lint/suspicious/noConsole: Cloud Loggingへの転送にconsole.logが必要
	console.log(JSON.stringify(logEntry, errorReplacer));
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
