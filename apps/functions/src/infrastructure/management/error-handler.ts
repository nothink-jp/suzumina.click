/**
 * 包括的エラーハンドリングシステム
 *
 * Cloud Functions全体のエラー処理を統一し、
 * 適切なエラー分離、復旧、レポーティングを提供します。
 */

import * as logger from "../../shared/logger";

/**
 * エラーの種類定義
 */
export enum ErrorType {
	// 外部API関連
	YOUTUBE_API_ERROR = "YOUTUBE_API_ERROR",
	YOUTUBE_QUOTA_EXCEEDED = "YOUTUBE_QUOTA_EXCEEDED",
	DLSITE_SCRAPING_ERROR = "DLSITE_SCRAPING_ERROR",
	DLSITE_STRUCTURE_CHANGED = "DLSITE_STRUCTURE_CHANGED",

	// データベース関連
	FIRESTORE_ERROR = "FIRESTORE_ERROR",
	FIRESTORE_BATCH_ERROR = "FIRESTORE_BATCH_ERROR",

	// パーサー関連
	PARSING_ERROR = "PARSING_ERROR",
	VALIDATION_ERROR = "VALIDATION_ERROR",

	// システム関連
	NETWORK_ERROR = "NETWORK_ERROR",
	TIMEOUT_ERROR = "TIMEOUT_ERROR",
	CONFIGURATION_ERROR = "CONFIGURATION_ERROR",

	// ビジネスロジック関連
	DATA_QUALITY_ERROR = "DATA_QUALITY_ERROR",
	METADATA_ERROR = "METADATA_ERROR",

	// 不明なエラー
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * エラーの深刻度定義
 */
export enum ErrorSeverity {
	LOW = "LOW", // ログのみ、処理継続
	MEDIUM = "MEDIUM", // 警告、部分的な処理継続
	HIGH = "HIGH", // エラー、処理中断・復旧試行
	CRITICAL = "CRITICAL", // 重大、即座に処理停止・アラート
}

/**
 * 復旧戦略の種類
 */
export enum RecoveryStrategy {
	NONE = "NONE", // 復旧処理なし
	RETRY = "RETRY", // 単純リトライ
	FALLBACK = "FALLBACK", // フォールバック処理
	PARTIAL_SKIP = "PARTIAL_SKIP", // 問題部分をスキップして継続
	GRACEFUL_DEGRADATION = "GRACEFUL_DEGRADATION", // 機能を制限して継続
	CIRCUIT_BREAKER = "CIRCUIT_BREAKER", // サーキットブレーカー発動
}

/**
 * 構造化エラー情報
 */
export interface StructuredError {
	/** エラーID（トレーシング用） */
	errorId: string;
	/** エラータイプ */
	type: ErrorType;
	/** 深刻度 */
	severity: ErrorSeverity;
	/** エラーメッセージ */
	message: string;
	/** 詳細情報 */
	details?: Record<string, unknown>;
	/** 発生コンテキスト */
	context: {
		function: string;
		operation: string;
		timestamp: Date;
		environment: string;
	};
	/** 復旧戦略 */
	recoveryStrategy: RecoveryStrategy;
	/** 原因となった元のエラー */
	originalError?: Error;
	/** スタックトレース */
	stackTrace?: string;
	/** 関連するリソース */
	affectedResources?: string[];
}

/**
 * エラー処理結果
 */
export interface ErrorHandlingResult {
	/** 処理継続可能かどうか */
	canContinue: boolean;
	/** 復旧が成功したかどうか */
	recoverySuccessful: boolean;
	/** 復旧後のデータ */
	recoveredData?: unknown;
	/** 追加の推奨アクション */
	recommendedActions: string[];
	/** メトリクス用の分類 */
	category: string;
}

/**
 * エラーハンドラー設定
 */
export interface ErrorHandlerConfig {
	/** 環境（本番・開発等） */
	environment: string;
	/** デバッグモード */
	debugMode: boolean;
	/** 自動復旧の有効化 */
	autoRecoveryEnabled: boolean;
	/** サーキットブレーカー設定 */
	circuitBreaker: {
		errorThreshold: number;
		timeWindow: number;
		cooldownPeriod: number;
	};
}

/**
 * 包括的エラーハンドラークラス
 */
export class ErrorHandler {
	private static instance: ErrorHandler;
	private errorCount: Map<string, number> = new Map();
	private circuitBreakers: Map<
		string,
		{ isOpen: boolean; lastFailure: Date; failureCount: number }
	> = new Map();

	private readonly config: ErrorHandlerConfig = {
		environment: process.env.NODE_ENV || "development",
		debugMode: process.env.NODE_ENV === "development",
		autoRecoveryEnabled: true,
		circuitBreaker: {
			errorThreshold: 5,
			timeWindow: 300000, // 5分
			cooldownPeriod: 60000, // 1分
		},
	};

	private constructor() {
		logger.info("ErrorHandler初期化完了", {
			environment: this.config.environment,
			autoRecovery: this.config.autoRecoveryEnabled,
		});
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * エラーを処理する
	 */
	public async handleError(
		error: Error | StructuredError,
		context: {
			function: string;
			operation: string;
			additionalInfo?: Record<string, unknown>;
		},
	): Promise<ErrorHandlingResult> {
		const structuredError = this.createStructuredError(error, context);

		// エラーログ出力
		this.logError(structuredError);

		// エラーカウント更新
		this.updateErrorCount(structuredError);

		// サーキットブレーカーチェック
		const circuitBreakerResult = this.checkCircuitBreaker(structuredError);
		if (circuitBreakerResult.isOpen) {
			return {
				canContinue: false,
				recoverySuccessful: false,
				recommendedActions: ["サーキットブレーカーが発動中", "システム復旧後に再試行"],
				category: "circuit_breaker",
			};
		}

		// 復旧戦略の実行
		const recoveryResult = await this.executeRecoveryStrategy(structuredError);

		// メトリクス記録
		this.recordErrorMetrics(structuredError, recoveryResult);

		return recoveryResult;
	}

	/**
	 * 構造化エラーを作成
	 */
	private createStructuredError(
		error: Error | StructuredError,
		context: { function: string; operation: string; additionalInfo?: Record<string, unknown> },
	): StructuredError {
		if (this.isStructuredError(error)) {
			return error;
		}

		const errorType = this.classifyError(error);
		const severity = this.determineSeverity(errorType, error);
		const recoveryStrategy = this.determineRecoveryStrategy(errorType, severity);

		return {
			errorId: this.generateErrorId(),
			type: errorType,
			severity,
			message: error.message,
			details: {
				...context.additionalInfo,
				errorName: error.name,
				errorCode: (error as unknown as { code?: string }).code,
			},
			context: {
				function: context.function,
				operation: context.operation,
				timestamp: new Date(),
				environment: this.config.environment,
			},
			recoveryStrategy,
			originalError: error,
			stackTrace: error.stack,
			affectedResources: this.identifyAffectedResources(error, context),
		};
	}

	/**
	 * エラーの分類
	 */
	private classifyError(error: Error): ErrorType {
		const message = error.message.toLowerCase();
		const name = error.name.toLowerCase();
		const code = (error as unknown as { code?: string | number }).code;

		// YouTube API関連
		if (message.includes("youtube") || message.includes("quota")) {
			if (message.includes("quota") || code === 403) {
				return ErrorType.YOUTUBE_QUOTA_EXCEEDED;
			}
			return ErrorType.YOUTUBE_API_ERROR;
		}

		// DLsite関連
		if (message.includes("dlsite") || message.includes("scraping")) {
			if (message.includes("structure") || message.includes("selector")) {
				return ErrorType.DLSITE_STRUCTURE_CHANGED;
			}
			return ErrorType.DLSITE_SCRAPING_ERROR;
		}

		// Firestore関連
		if (message.includes("firestore") || name.includes("firestore")) {
			if (message.includes("batch")) {
				return ErrorType.FIRESTORE_BATCH_ERROR;
			}
			return ErrorType.FIRESTORE_ERROR;
		}

		// パーサー関連
		if (message.includes("parse") || message.includes("validation")) {
			if (message.includes("validation")) {
				return ErrorType.VALIDATION_ERROR;
			}
			return ErrorType.PARSING_ERROR;
		}

		// ネットワーク関連
		if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
			if (message.includes("timeout")) {
				return ErrorType.TIMEOUT_ERROR;
			}
			return ErrorType.NETWORK_ERROR;
		}

		// 設定関連
		if (message.includes("config") || message.includes("environment")) {
			return ErrorType.CONFIGURATION_ERROR;
		}

		return ErrorType.UNKNOWN_ERROR;
	}

	/**
	 * 深刻度の判定
	 */
	private determineSeverity(errorType: ErrorType, _error: Error): ErrorSeverity {
		switch (errorType) {
			case ErrorType.YOUTUBE_QUOTA_EXCEEDED:
			case ErrorType.DLSITE_STRUCTURE_CHANGED:
			case ErrorType.CONFIGURATION_ERROR:
				return ErrorSeverity.CRITICAL;

			case ErrorType.FIRESTORE_BATCH_ERROR:
			case ErrorType.YOUTUBE_API_ERROR:
				return ErrorSeverity.HIGH;

			case ErrorType.DLSITE_SCRAPING_ERROR:
			case ErrorType.FIRESTORE_ERROR:
			case ErrorType.NETWORK_ERROR:
			case ErrorType.TIMEOUT_ERROR:
				return ErrorSeverity.MEDIUM;

			case ErrorType.PARSING_ERROR:
			case ErrorType.VALIDATION_ERROR:
			case ErrorType.DATA_QUALITY_ERROR:
				return ErrorSeverity.LOW;

			default:
				return ErrorSeverity.MEDIUM;
		}
	}

	/**
	 * 復旧戦略の決定
	 */
	private determineRecoveryStrategy(
		errorType: ErrorType,
		severity: ErrorSeverity,
	): RecoveryStrategy {
		switch (errorType) {
			case ErrorType.YOUTUBE_QUOTA_EXCEEDED:
				return RecoveryStrategy.CIRCUIT_BREAKER;

			case ErrorType.DLSITE_STRUCTURE_CHANGED:
				return RecoveryStrategy.FALLBACK;

			case ErrorType.NETWORK_ERROR:
			case ErrorType.TIMEOUT_ERROR:
				return RecoveryStrategy.RETRY;

			case ErrorType.PARSING_ERROR:
			case ErrorType.VALIDATION_ERROR:
				return RecoveryStrategy.PARTIAL_SKIP;

			case ErrorType.FIRESTORE_BATCH_ERROR:
				return RecoveryStrategy.GRACEFUL_DEGRADATION;

			case ErrorType.CONFIGURATION_ERROR:
				return RecoveryStrategy.NONE;

			default:
				return severity === ErrorSeverity.LOW
					? RecoveryStrategy.PARTIAL_SKIP
					: RecoveryStrategy.RETRY;
		}
	}

	/**
	 * 復旧戦略の実行
	 */
	private async executeRecoveryStrategy(error: StructuredError): Promise<ErrorHandlingResult> {
		if (!this.config.autoRecoveryEnabled) {
			return {
				canContinue: false,
				recoverySuccessful: false,
				recommendedActions: ["自動復旧は無効化されています"],
				category: "manual_intervention_required",
			};
		}

		switch (error.recoveryStrategy) {
			case RecoveryStrategy.RETRY:
				return this.executeRetryStrategy(error);

			case RecoveryStrategy.FALLBACK:
				return this.executeFallbackStrategy(error);

			case RecoveryStrategy.PARTIAL_SKIP:
				return this.executePartialSkipStrategy(error);

			case RecoveryStrategy.GRACEFUL_DEGRADATION:
				return this.executeGracefulDegradationStrategy(error);

			case RecoveryStrategy.CIRCUIT_BREAKER:
				return this.executeCircuitBreakerStrategy(error);
			default:
				return {
					canContinue: false,
					recoverySuccessful: false,
					recommendedActions: this.generateRecommendations(error),
					category: "no_recovery",
				};
		}
	}

	/**
	 * リトライ戦略
	 */
	private async executeRetryStrategy(error: StructuredError): Promise<ErrorHandlingResult> {
		logger.warn("リトライ機能は無効化されています", {
			errorId: error.errorId,
			errorType: error.type,
		});

		return {
			canContinue: false,
			recoverySuccessful: false,
			recommendedActions: ["リトライ機能は無効化されています", "手動介入が必要です"],
			category: "retry_disabled",
		};
	}

	/**
	 * フォールバック戦略
	 */
	private async executeFallbackStrategy(error: StructuredError): Promise<ErrorHandlingResult> {
		logger.info("フォールバック戦略実行", { errorId: error.errorId });

		// DLsite構造変更の場合のフォールバック例
		if (error.type === ErrorType.DLSITE_STRUCTURE_CHANGED) {
			return {
				canContinue: true,
				recoverySuccessful: true,
				recoveredData: { fallbackMode: true },
				recommendedActions: ["フォールバックセレクターを使用", "パーサー設定の更新を検討"],
				category: "fallback_success",
			};
		}

		return {
			canContinue: true,
			recoverySuccessful: false,
			recommendedActions: ["フォールバック処理を実装してください"],
			category: "fallback_incomplete",
		};
	}

	/**
	 * 部分スキップ戦略
	 */
	private async executePartialSkipStrategy(error: StructuredError): Promise<ErrorHandlingResult> {
		logger.info("部分スキップ戦略実行", { errorId: error.errorId });

		return {
			canContinue: true,
			recoverySuccessful: true,
			recommendedActions: [
				"問題のあるデータをスキップして処理継続",
				"スキップされたデータのログを確認",
			],
			category: "partial_skip",
		};
	}

	/**
	 * 段階的機能制限戦略
	 */
	private async executeGracefulDegradationStrategy(
		error: StructuredError,
	): Promise<ErrorHandlingResult> {
		logger.info("段階的機能制限戦略実行", { errorId: error.errorId });

		return {
			canContinue: true,
			recoverySuccessful: true,
			recoveredData: { degradedMode: true },
			recommendedActions: ["機能を制限して処理継続", "完全復旧後に制限解除"],
			category: "graceful_degradation",
		};
	}

	/**
	 * サーキットブレーカー戦略
	 */
	private async executeCircuitBreakerStrategy(
		error: StructuredError,
	): Promise<ErrorHandlingResult> {
		const operation = `${error.context.function}.${error.context.operation}`;
		this.activateCircuitBreaker(operation);

		logger.error("サーキットブレーカー発動", {
			errorId: error.errorId,
			operation,
			cooldownPeriod: this.config.circuitBreaker.cooldownPeriod,
		});

		return {
			canContinue: false,
			recoverySuccessful: false,
			recommendedActions: [
				"サーキットブレーカーが発動しました",
				`${this.config.circuitBreaker.cooldownPeriod / 1000}秒後に自動復旧`,
				"根本的な問題の解決が必要",
			],
			category: "circuit_breaker_activated",
		};
	}

	/**
	 * 推奨アクションの生成
	 */
	private generateRecommendations(error: StructuredError): string[] {
		const recommendations: string[] = [];

		switch (error.type) {
			case ErrorType.YOUTUBE_QUOTA_EXCEEDED:
				recommendations.push("YouTube APIクォータ制限を確認");
				recommendations.push("実行頻度の調整を検討");
				break;

			case ErrorType.DLSITE_STRUCTURE_CHANGED:
				recommendations.push("DLsiteページ構造の確認");
				recommendations.push("パーサー設定の更新");
				break;

			case ErrorType.FIRESTORE_ERROR:
				recommendations.push("Firestoreの接続状況を確認");
				recommendations.push("バッチサイズの調整を検討");
				break;

			case ErrorType.CONFIGURATION_ERROR:
				recommendations.push("環境変数の設定を確認");
				recommendations.push("設定ファイルの検証");
				break;

			default:
				recommendations.push("ログの詳細確認");
				recommendations.push("必要に応じて開発チームに連絡");
		}

		return recommendations;
	}

	/**
	 * その他のヘルパーメソッド
	 */
	private isStructuredError(error: unknown): error is StructuredError {
		return Boolean(error && typeof error === "object" && "errorId" in error && "type" in error);
	}

	private generateErrorId(): string {
		return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private identifyAffectedResources(
		_error: Error,
		context: { additionalInfo?: Record<string, unknown> },
	): string[] {
		const resources: string[] = [];

		if (context.additionalInfo?.productId) {
			resources.push(`product:${context.additionalInfo.productId}`);
		}

		if (context.additionalInfo?.videoId) {
			resources.push(`video:${context.additionalInfo.videoId}`);
		}

		return resources;
	}

	private logError(error: StructuredError): void {
		const logMethod =
			error.severity === ErrorSeverity.CRITICAL
				? logger.error
				: error.severity === ErrorSeverity.HIGH
					? logger.error
					: error.severity === ErrorSeverity.MEDIUM
						? logger.warn
						: logger.info;

		logMethod(`${error.severity} Error: ${error.message}`, {
			errorId: error.errorId,
			type: error.type,
			context: error.context,
			details: error.details,
			recoveryStrategy: error.recoveryStrategy,
		});
	}

	private updateErrorCount(error: StructuredError): void {
		const key = `${error.type}_${error.context.function}`;
		this.errorCount.set(key, (this.errorCount.get(key) || 0) + 1);
	}

	private checkCircuitBreaker(error: StructuredError): { isOpen: boolean; reason?: string } {
		const operation = `${error.context.function}.${error.context.operation}`;
		const breaker = this.circuitBreakers.get(operation);

		if (!breaker) {
			return { isOpen: false };
		}

		const now = new Date();
		const timeSinceLastFailure = now.getTime() - breaker.lastFailure.getTime();

		// クールダウン期間チェック
		if (breaker.isOpen && timeSinceLastFailure > this.config.circuitBreaker.cooldownPeriod) {
			breaker.isOpen = false;
			breaker.failureCount = 0;
			logger.info("サーキットブレーカーリセット", { operation });
		}

		return {
			isOpen: breaker.isOpen,
			reason: breaker.isOpen ? "Circuit breaker is open due to repeated failures" : undefined,
		};
	}

	private activateCircuitBreaker(operation: string): void {
		this.circuitBreakers.set(operation, {
			isOpen: true,
			lastFailure: new Date(),
			failureCount: this.config.circuitBreaker.errorThreshold,
		});
	}

	private recordErrorMetrics(error: StructuredError, result: ErrorHandlingResult): void {
		// Cloud Monitoring等へのメトリクス送信ロジックを実装
		logger.debug("エラーメトリクス記録", {
			errorId: error.errorId,
			type: error.type,
			severity: error.severity,
			recoverySuccessful: result.recoverySuccessful,
			category: result.category,
		});
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getErrorHandler(): ErrorHandler {
	return ErrorHandler.getInstance();
}

/**
 * エラーを処理するヘルパー関数
 */
export async function handleError(
	error: Error,
	context: { function: string; operation: string; additionalInfo?: Record<string, unknown> },
): Promise<ErrorHandlingResult> {
	return getErrorHandler().handleError(error, context);
}
