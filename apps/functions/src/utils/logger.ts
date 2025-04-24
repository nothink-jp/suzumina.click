/**
 * Cloud Run Functions用カスタムロガー
 * 
 * このモジュールはGoogle Cloud向けの構造化ログ出力を提供します。
 * firebase-functions/loggerの代わりに使用します。
 */

// ログレベルの定義
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARNING',
  ERROR = 'ERROR'
}

// ログオプションのインターフェース
interface LogOptions {
  // 追加のメタデータ
  [key: string]: unknown;
}

/**
 * 構造化ログ出力を行うための基本関数
 * 
 * @param level - ログレベル
 * @param message - ログメッセージ（文字列）
 * @param optionsOrError - 追加のメタデータまたはエラーオブジェクト
 */
function logMessage(level: LogLevel, message: string, optionsOrError?: LogOptions | unknown): void {
  // 基本ログ構造
  const logEntry: Record<string, unknown> = {
    severity: level,
    message
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
      // その他のオプションの場合
      Object.assign(logEntry, optionsOrError);
    }
  }

  // Google Cloudの構造化ログ形式に合わせてJSON出力
  console.log(JSON.stringify(logEntry));
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