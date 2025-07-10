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
 * ログを標準出力に送信する基本関数
 * 環境変数 LOG_FORMAT=console でコンソール用の読みやすい形式に変更可能
 * Cloud Run Functionsでは標準出力が自動的にCloud Loggingに転送される
 *
 * @param level - ログレベル（Cloud Logging標準）
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
function logMessage(level: LogLevel, message: string, optionsOrError?: LogOptions | unknown): void {
	// 環境変数でコンソール形式を選択可能
	const useConsoleFormat = process.env.LOG_FORMAT === "console";

	if (useConsoleFormat) {
		// コンソール用の読みやすい形式
		const timestamp = new Date().toISOString();
		const levelIcon = getLevelIcon(level);

		let logLine = `${timestamp} ${levelIcon} ${level} ${message}`;

		// 追加情報の処理
		if (optionsOrError) {
			if (optionsOrError instanceof Error) {
				logLine += `\n  Error: ${optionsOrError.message}`;
				if (optionsOrError.stack) {
					logLine += `\n  Stack: ${optionsOrError.stack}`;
				}
			} else if (typeof optionsOrError === "object" && optionsOrError !== null) {
				// オブジェクトの場合は整形して表示
				const formatted = JSON.stringify(optionsOrError, null, 2);
				logLine += `\n  Data: ${formatted}`;
			}
		}

		// biome-ignore lint/suspicious/noConsole: コンソール形式ログ出力
		console.log(logLine);
	} else {
		// Cloud Run Functions用の構造化ログ（既存の実装）
		const logEntry: Record<string, unknown> = {
			severity: level,
			message,
			// Cloud Functions v2の実行情報
			...(process.env.K_SERVICE && {
				"logging.googleapis.com/labels": {
					service: process.env.K_SERVICE,
					...(process.env.K_REVISION && { revision: process.env.K_REVISION }),
					...(process.env.K_CONFIGURATION && { configuration: process.env.K_CONFIGURATION }),
				},
			}),
		};

		// オプションまたはエラーの処理
		if (optionsOrError) {
			if (optionsOrError instanceof Error) {
				// エラーオブジェクトの場合
				logEntry.error = {
					message: optionsOrError.message,
					name: optionsOrError.name,
					stack: optionsOrError.stack,
				};
			} else {
				// その他のオプションの場合は直接マージ
				Object.assign(logEntry, optionsOrError);
			}
		}

		// 標準出力に構造化ログを出力（Cloud Run Functionsが自動的にCloud Loggingに転送）
		// biome-ignore lint/suspicious/noConsole: Cloud Loggingへの転送にconsole.logが必要
		console.log(JSON.stringify(logEntry));
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
