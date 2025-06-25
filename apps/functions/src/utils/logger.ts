/**
 * Cloud Run Functions用ロガー
 *
 * このモジュールは@google-cloud/loggingを使用してGoogle Cloud Loggingと統合した
 * 構造化ログ出力を提供します。Cloud Functions v2環境での運用に最適化されています。
 */

import { Logging } from "@google-cloud/logging";

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

// Cloud Loggingクライアントの初期化
const logging = new Logging({
	projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
});

// ログ名の設定（Cloud Functions v2に最適化）
const logName = process.env.K_SERVICE || "cloud-functions";
const log = logging.log(logName);

/**
 * Cloud Loggingに構造化ログを送信する基本関数
 *
 * @param level - ログレベル（Cloud Logging標準）
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
async function logMessage(
	level: LogLevel,
	message: string,
	optionsOrError?: LogOptions | unknown,
): Promise<void> {
	// 基本ログ構造
	const metadata: Record<string, unknown> = {
		severity: level,
		timestamp: new Date().toISOString(),
		// Cloud Functions v2の実行情報
		...(process.env.K_SERVICE && { service: process.env.K_SERVICE }),
		...(process.env.K_REVISION && { revision: process.env.K_REVISION }),
		...(process.env.K_CONFIGURATION && { configuration: process.env.K_CONFIGURATION }),
	};

	// ログデータの構築
	const data: Record<string, unknown> = {
		message,
	};

	// オプションまたはエラーの処理
	if (optionsOrError) {
		if (optionsOrError instanceof Error) {
			// エラーオブジェクトの場合
			data.error = {
				message: optionsOrError.message,
				name: optionsOrError.name,
				stack: optionsOrError.stack,
			};
		} else {
			// その他のオプションの場合
			Object.assign(data, optionsOrError);
		}
	}

	// Cloud Loggingエントリの作成
	const entry = log.entry(metadata, data);

	try {
		// Cloud Loggingに送信
		await log.write(entry);
	} catch (error) {
		// Cloud Loggingへの送信に失敗した場合はconsoleに出力
		console.error("Failed to write to Cloud Logging:", error);
		console.log(JSON.stringify({ severity: level, message, ...data }));
	}
}

/**
 * 同期版のログ出力（従来の互換性維持）
 * Cloud Loggingの送信は非同期で行い、エラー時のみconsoleに出力
 */
function logMessageSync(
	level: LogLevel,
	message: string,
	optionsOrError?: LogOptions | unknown,
): void {
	// 非同期で実行（エラーハンドリング含む）
	logMessage(level, message, optionsOrError).catch((error) => {
		console.error("Logger error:", error);
	});
}

/**
 * デバッグレベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function debug(message: string, options?: LogOptions): void {
	logMessageSync(LogLevel.DEBUG, message, options);
}

/**
 * 情報レベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function info(message: string, options?: LogOptions): void {
	logMessageSync(LogLevel.INFO, message, options);
}

/**
 * 警告レベルのログを出力
 *
 * @param message - ログメッセージ
 * @param options - 追加のメタデータ（オプション）
 */
export function warn(message: string, options?: LogOptions): void {
	logMessageSync(LogLevel.WARN, message, options);
}

/**
 * エラーレベルのログを出力
 *
 * @param message - ログメッセージ
 * @param errorOrOptions - エラーオブジェクトまたは追加のメタデータ
 */
export function error(message: string, errorOrOptions?: unknown): void {
	logMessageSync(LogLevel.ERROR, message, errorOrOptions);
}

/**
 * 非同期版のログ関数（awaitが必要な場合用）
 */
export const asyncLogger = {
	debug: async (message: string, options?: LogOptions): Promise<void> =>
		logMessage(LogLevel.DEBUG, message, options),
	info: async (message: string, options?: LogOptions): Promise<void> =>
		logMessage(LogLevel.INFO, message, options),
	warn: async (message: string, options?: LogOptions): Promise<void> =>
		logMessage(LogLevel.WARN, message, options),
	error: async (message: string, errorOrOptions?: unknown): Promise<void> =>
		logMessage(LogLevel.ERROR, message, errorOrOptions),
};
