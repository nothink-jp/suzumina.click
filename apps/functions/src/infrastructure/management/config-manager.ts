/**
 * 統合設定管理システム
 *
 * Cloud Functions全体の設定を一元管理し、
 * 環境変数、動的設定、デフォルト値の統合管理を提供します。
 */

import * as logger from "../../shared/logger";

/**
 * DLsite関連設定
 */
export interface DLsiteConfig {
	/** 1回の実行での最大ページ数 */
	maxPagesPerExecution: number;
	/** ページあたりの作品数 */
	itemsPerPage: number;
	/** リクエスト間隔（ミリ秒） */
	requestDelay: number;
	/** User-Agentローテーション有効化 */
	userAgentRotationEnabled: boolean;
	/** タイムアウト時間（ミリ秒） */
	timeoutMs: number;
	/** リトライ回数 */
	maxRetries: number;
	/** リトライ間隔（ミリ秒） */
	retryDelay: number;
	/** 解析健全性チェック有効化 */
	healthCheckEnabled: boolean;
	/** 健全性チェック間隔（分） */
	healthCheckIntervalMinutes: number;
}

/**
 * YouTube関連設定
 */
export interface YouTubeConfig {
	/** 1回の実行での最大ページ数 */
	maxPagesPerExecution: number;
	/** バッチサイズ */
	maxBatchSize: number;
	/** 日次クォータ制限 */
	dailyQuotaLimit: number;
	/** 時間毎クォータ制限 */
	hourlyQuotaLimit: number;
	/** クォータ監視有効化 */
	quotaMonitoringEnabled: boolean;
	/** タイムアウト時間（ミリ秒） */
	timeoutMs: number;
}

/**
 * Firestore関連設定
 */
export interface FirestoreConfig {
	/** バッチサイズ */
	batchSize: number;
	/** 大量バッチの分割閾値 */
	largeBatchThreshold: number;
	/** タイムアウト時間（ミリ秒） */
	timeoutMs: number;
	/** リトライ回数 */
	maxRetries: number;
	/** 接続プールサイズ */
	connectionPoolSize: number;
}

/**
 * エラーハンドリング設定
 */
export interface ErrorHandlingConfig {
	/** 自動復旧有効化 */
	autoRecoveryEnabled: boolean;
	/** デバッグモード */
	debugMode: boolean;
	/** サーキットブレーカー設定 */
	circuitBreaker: {
		errorThreshold: number;
		timeWindowMs: number;
		cooldownPeriodMs: number;
	};
	/** ログレベル */
	logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
}

/**
 * パフォーマンス設定
 */
export interface PerformanceConfig {
	/** 並列処理数 */
	concurrency: number;
	/** メモリ制限（MB） */
	memoryLimitMB: number;
	/** 実行時間制限（秒） */
	executionTimeoutSeconds: number;
	/** キャッシュ有効化 */
	cachingEnabled: boolean;
	/** キャッシュTTL（秒） */
	cacheTTLSeconds: number;
}

/**
 * 統合設定インターフェース
 */
export interface CloudFunctionConfig {
	/** 環境識別子 */
	environment: "development" | "staging" | "production";
	/** バージョン */
	version: string;
	/** 最終更新日時 */
	lastUpdated: string;

	/** DLsite設定 */
	dlsite: DLsiteConfig;
	/** YouTube設定 */
	youtube: YouTubeConfig;
	/** Firestore設定 */
	firestore: FirestoreConfig;
	/** エラーハンドリング設定 */
	errorHandling: ErrorHandlingConfig;
	/** パフォーマンス設定 */
	performance: PerformanceConfig;

	/** 機能フラグ */
	features: {
		dlsiteHealthMonitoring: boolean;
		youtubeQuotaMonitoring: boolean;
		userAgentRotation: boolean;
		advancedErrorHandling: boolean;
		performanceMonitoring: boolean;
	};
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: CloudFunctionConfig = {
	environment: "development",
	version: "2025.07.03",
	lastUpdated: new Date().toISOString(),

	dlsite: {
		maxPagesPerExecution: 1,
		itemsPerPage: 100,
		requestDelay: 1000,
		userAgentRotationEnabled: true,
		timeoutMs: 30000,
		maxRetries: 3,
		retryDelay: 1000,
		healthCheckEnabled: true,
		healthCheckIntervalMinutes: 60,
	},

	youtube: {
		maxPagesPerExecution: 3,
		maxBatchSize: 50,
		dailyQuotaLimit: 10000,
		hourlyQuotaLimit: 3000,
		quotaMonitoringEnabled: true,
		timeoutMs: 30000,
	},

	firestore: {
		batchSize: 500,
		largeBatchThreshold: 500,
		timeoutMs: 60000,
		maxRetries: 3,
		connectionPoolSize: 10,
	},

	errorHandling: {
		autoRecoveryEnabled: true,
		debugMode: false,
		circuitBreaker: {
			errorThreshold: 5,
			timeWindowMs: 300000,
			cooldownPeriodMs: 60000,
		},
		logLevel: "INFO",
	},

	performance: {
		concurrency: 5,
		memoryLimitMB: 1024,
		executionTimeoutSeconds: 540,
		cachingEnabled: true,
		cacheTTLSeconds: 3600,
	},

	features: {
		dlsiteHealthMonitoring: true,
		youtubeQuotaMonitoring: true,
		userAgentRotation: true,
		advancedErrorHandling: true,
		performanceMonitoring: true,
	},
};

/**
 * 環境別設定オーバーライド
 */
const ENVIRONMENT_OVERRIDES: Record<string, Partial<CloudFunctionConfig>> = {
	development: {
		errorHandling: {
			debugMode: true,
			logLevel: "DEBUG",
			autoRecoveryEnabled: true,
			circuitBreaker: {
				errorThreshold: 3,
				timeWindowMs: 60000,
				cooldownPeriodMs: 30000,
			},
		},
		dlsite: {
			maxPagesPerExecution: 1,
			requestDelay: 2000,
			itemsPerPage: 100,
			userAgentRotationEnabled: true,
			timeoutMs: 30000,
			maxRetries: 3,
			retryDelay: 1000,
			healthCheckEnabled: true,
			healthCheckIntervalMinutes: 60,
		},
		youtube: {
			maxPagesPerExecution: 1,
			maxBatchSize: 50,
			dailyQuotaLimit: 10000,
			hourlyQuotaLimit: 3600,
			quotaMonitoringEnabled: true,
			timeoutMs: 30000,
		},
	},

	staging: {
		errorHandling: {
			debugMode: false,
			logLevel: "INFO",
			autoRecoveryEnabled: true,
			circuitBreaker: {
				errorThreshold: 5,
				timeWindowMs: 60000,
				cooldownPeriodMs: 30000,
			},
		},
		dlsite: {
			maxPagesPerExecution: 2,
			requestDelay: 1000,
			itemsPerPage: 100,
			userAgentRotationEnabled: true,
			timeoutMs: 30000,
			maxRetries: 3,
			retryDelay: 1000,
			healthCheckEnabled: true,
			healthCheckIntervalMinutes: 60,
		},
		youtube: {
			maxPagesPerExecution: 2,
			maxBatchSize: 50,
			dailyQuotaLimit: 10000,
			hourlyQuotaLimit: 3600,
			quotaMonitoringEnabled: true,
			timeoutMs: 30000,
		},
	},

	production: {
		errorHandling: {
			debugMode: false,
			logLevel: "WARN",
			autoRecoveryEnabled: true,
			circuitBreaker: {
				errorThreshold: 10,
				timeWindowMs: 60000,
				cooldownPeriodMs: 30000,
			},
		},
		dlsite: {
			maxPagesPerExecution: 5,
			requestDelay: 500,
			itemsPerPage: 100,
			userAgentRotationEnabled: true,
			timeoutMs: 30000,
			maxRetries: 3,
			retryDelay: 1000,
			healthCheckEnabled: true,
			healthCheckIntervalMinutes: 60,
		},
		youtube: {
			maxPagesPerExecution: 5,
			maxBatchSize: 50,
			dailyQuotaLimit: 10000,
			hourlyQuotaLimit: 3600,
			quotaMonitoringEnabled: true,
			timeoutMs: 30000,
		},
		performance: {
			concurrency: 10,
			memoryLimitMB: 512,
			executionTimeoutSeconds: 540,
			cachingEnabled: true,
			cacheTTLSeconds: 3600,
		},
	},
};

/**
 * 設定管理クラス
 */
export class ConfigManager {
	private static instance: ConfigManager;
	private config: CloudFunctionConfig;
	private environmentOverrides: Record<string, unknown> = {};

	private constructor() {
		this.config = this.loadConfig();
		this.loadEnvironmentVariables();

		logger.info("ConfigManager初期化完了", {
			environment: this.config.environment,
			version: this.config.version,
			featuresEnabled: Object.entries(this.config.features)
				.filter(([_, enabled]) => enabled)
				.map(([feature]) => feature),
		});
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	/**
	 * 設定を読み込み
	 */
	private loadConfig(): CloudFunctionConfig {
		const environment = (process.env.NODE_ENV ||
			"development") as CloudFunctionConfig["environment"];

		// デフォルト設定をベースに開始
		let config = { ...DEFAULT_CONFIG };
		config.environment = environment;

		// 環境別オーバーライドを適用
		const envOverrides = ENVIRONMENT_OVERRIDES[environment];
		if (envOverrides) {
			config = this.deepMerge(config, envOverrides);
		}

		return config;
	}

	/**
	 * 環境変数から設定を読み込み
	 */
	private loadEnvironmentVariables(): void {
		// DLsite設定
		if (process.env.DLSITE_MAX_PAGES) {
			this.config.dlsite.maxPagesPerExecution = Number.parseInt(process.env.DLSITE_MAX_PAGES, 10);
		}
		if (process.env.DLSITE_REQUEST_DELAY) {
			this.config.dlsite.requestDelay = Number.parseInt(process.env.DLSITE_REQUEST_DELAY, 10);
		}

		// YouTube設定
		if (process.env.YOUTUBE_MAX_PAGES) {
			this.config.youtube.maxPagesPerExecution = Number.parseInt(process.env.YOUTUBE_MAX_PAGES, 10);
		}
		if (process.env.YOUTUBE_QUOTA_LIMIT) {
			this.config.youtube.dailyQuotaLimit = Number.parseInt(process.env.YOUTUBE_QUOTA_LIMIT, 10);
		}

		// エラーハンドリング設定
		if (process.env.DEBUG_MODE) {
			this.config.errorHandling.debugMode = process.env.DEBUG_MODE === "true";
		}
		if (process.env.LOG_LEVEL) {
			this.config.errorHandling.logLevel = process.env.LOG_LEVEL as
				| "DEBUG"
				| "INFO"
				| "WARN"
				| "ERROR";
		}

		// 機能フラグ
		if (process.env.DISABLE_HEALTH_MONITORING) {
			this.config.features.dlsiteHealthMonitoring = false;
		}
		if (process.env.DISABLE_QUOTA_MONITORING) {
			this.config.features.youtubeQuotaMonitoring = false;
		}

		logger.debug("環境変数から設定を読み込み完了", {
			overriddenFields: Object.keys(this.environmentOverrides),
		});
	}

	/**
	 * 設定を取得
	 */
	public getConfig(): CloudFunctionConfig {
		return { ...this.config };
	}

	/**
	 * DLsite設定を取得
	 */
	public getDLsiteConfig(): DLsiteConfig {
		return { ...this.config.dlsite };
	}

	/**
	 * YouTube設定を取得
	 */
	public getYouTubeConfig(): YouTubeConfig {
		return { ...this.config.youtube };
	}

	/**
	 * Firestore設定を取得
	 */
	public getFirestoreConfig(): FirestoreConfig {
		return { ...this.config.firestore };
	}

	/**
	 * エラーハンドリング設定を取得
	 */
	public getErrorHandlingConfig(): ErrorHandlingConfig {
		return { ...this.config.errorHandling };
	}

	/**
	 * パフォーマンス設定を取得
	 */
	public getPerformanceConfig(): PerformanceConfig {
		return { ...this.config.performance };
	}

	/**
	 * 機能フラグを確認
	 */
	public isFeatureEnabled(feature: keyof CloudFunctionConfig["features"]): boolean {
		return this.config.features[feature];
	}

	/**
	 * 設定を動的に更新
	 */
	public updateConfig(updates: Partial<CloudFunctionConfig>): void {
		this.config = this.deepMerge(this.config, updates);
		this.config.lastUpdated = new Date().toISOString();

		logger.info("設定を更新しました", {
			updatedFields: Object.keys(updates),
			timestamp: this.config.lastUpdated,
		});
	}

	/**
	 * 特定セクションの設定を更新
	 */
	public updateSectionConfig<T extends keyof CloudFunctionConfig>(
		section: T,
		updates: Partial<CloudFunctionConfig[T]>,
	): void {
		const currentSection = (this.config[section] as Record<string, unknown>) || {};
		this.config[section] = Object.assign({}, currentSection, updates) as CloudFunctionConfig[T];

		this.config.lastUpdated = new Date().toISOString();

		logger.info(`${section}設定を更新しました`, {
			updatedFields: Object.keys(updates),
			timestamp: this.config.lastUpdated,
		});
	}

	/**
	 * 設定検証
	 */
	public validateConfig(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// DLsite設定検証
		if (this.config.dlsite.maxPagesPerExecution < 1) {
			errors.push("DLsite maxPagesPerExecution must be at least 1");
		}
		if (this.config.dlsite.requestDelay < 0) {
			errors.push("DLsite requestDelay must be non-negative");
		}

		// YouTube設定検証
		if (this.config.youtube.maxBatchSize > 50) {
			errors.push("YouTube maxBatchSize cannot exceed 50 (API limit)");
		}
		if (this.config.youtube.dailyQuotaLimit < 1000) {
			errors.push("YouTube dailyQuotaLimit seems too low");
		}

		// Firestore設定検証
		if (this.config.firestore.batchSize > 500) {
			errors.push("Firestore batchSize cannot exceed 500");
		}

		// パフォーマンス設定検証
		if (this.config.performance.concurrency > 20) {
			errors.push("Performance concurrency seems too high");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 設定のサマリー取得
	 */
	public getConfigSummary(): Record<string, unknown> {
		return {
			environment: this.config.environment,
			version: this.config.version,
			lastUpdated: this.config.lastUpdated,
			dlsite: {
				maxPages: this.config.dlsite.maxPagesPerExecution,
				userAgentRotation: this.config.dlsite.userAgentRotationEnabled,
				healthCheck: this.config.features.dlsiteHealthMonitoring,
			},
			youtube: {
				maxPages: this.config.youtube.maxPagesPerExecution,
				quotaLimit: this.config.youtube.dailyQuotaLimit,
				quotaMonitoring: this.config.features.youtubeQuotaMonitoring,
			},
			firestore: {
				batchSize: this.config.firestore.batchSize,
			},
			features: Object.entries(this.config.features)
				.filter(([_, enabled]) => enabled)
				.map(([feature]) => feature),
		};
	}

	/**
	 * デバッグ情報取得
	 */
	public getDebugInfo(): Record<string, unknown> {
		return {
			fullConfig: this.config,
			environmentOverrides: this.environmentOverrides,
			validation: this.validateConfig(),
			loadedAt: new Date().toISOString(),
		};
	}

	/**
	 * オブジェクトの深いマージ
	 */
	private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
		const result = { ...target };

		for (const key in source) {
			const sourceValue = source[key];
			if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
				result[key] = this.deepMerge(
					result[key] || ({} as T[Extract<keyof T, string>]),
					sourceValue as Partial<T[Extract<keyof T, string>]>,
				);
			} else if (sourceValue !== undefined) {
				result[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}

		return result;
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getConfigManager(): ConfigManager {
	return ConfigManager.getInstance();
}

/**
 * 設定を取得するヘルパー関数
 */
export function getConfig(): CloudFunctionConfig {
	return getConfigManager().getConfig();
}

/**
 * DLsite設定を取得するヘルパー関数
 */
export function getDLsiteConfig(): DLsiteConfig {
	return getConfigManager().getDLsiteConfig();
}

/**
 * YouTube設定を取得するヘルパー関数
 */
export function getYouTubeConfig(): YouTubeConfig {
	return getConfigManager().getYouTubeConfig();
}

/**
 * 機能フラグを確認するヘルパー関数
 */
export function isFeatureEnabled(feature: keyof CloudFunctionConfig["features"]): boolean {
	return getConfigManager().isFeatureEnabled(feature);
}
