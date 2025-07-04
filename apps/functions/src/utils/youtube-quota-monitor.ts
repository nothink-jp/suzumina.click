/**
 * YouTube API クォータ監視システム
 *
 * YouTube Data API v3のクォータ使用量を詳細に監視し、
 * 効率的なAPI利用とクォータ超過の予防を行います。
 */

import * as logger from "./logger";

/**
 * YouTube API操作のクォータコスト定義
 * 参考: https://developers.google.com/youtube/v3/determine_quota_cost
 */
export const QUOTA_COSTS = {
	// 検索関連
	search: 100,
	searchWithSnippet: 100,

	// 動画情報取得
	videosWithSnippet: 1,
	videosWithStatistics: 1,
	videosWithContentDetails: 1,
	videosWithLiveStreamingDetails: 1,
	videosWithTopicDetails: 1,
	videosWithStatus: 1,
	videosWithRecordingDetails: 1,
	videosWithPlayer: 1,

	// 複合操作（複数partを含む）
	videosFullDetails: 8, // snippet, statistics, contentDetails等の合計
} as const;

/**
 * クォータ使用統計
 */
export interface QuotaUsageStats {
	/** 本日の総使用量 */
	dailyUsage: number;
	/** 1時間の使用量 */
	hourlyUsage: number;
	/** 最後のリセット時刻 */
	lastReset: Date;
	/** 操作別使用量 */
	operationBreakdown: Record<string, number>;
	/** 推定残り使用可能量 */
	estimatedRemaining: number;
	/** クォータ効率性スコア (0-1) */
	efficiencyScore: number;
}

/**
 * クォータアラート設定
 */
export interface QuotaAlertConfig {
	/** 日次警告閾値 (%) */
	dailyWarningThreshold: number;
	/** 日次危険閾値 (%) */
	dailyCriticalThreshold: number;
	/** 時間毎警告閾値 */
	hourlyWarningThreshold: number;
	/** 予測クォータ超過アラート */
	predictiveAlertEnabled: boolean;
}

/**
 * YouTube APIクォータ監視クラス
 */
export class YouTubeQuotaMonitor {
	private static instance: YouTubeQuotaMonitor;
	private dailyUsage = 0;
	private hourlyUsage = 0;
	private operationCount: Record<string, number> = {};
	private lastHourReset = new Date();
	private lastDayReset = new Date();

	// Google Cloud クォータ制限（デフォルト値）
	private readonly DAILY_QUOTA_LIMIT = 10000;
	private readonly HOURLY_QUOTA_LIMIT = 3000; // 推奨値

	private readonly alertConfig: QuotaAlertConfig = {
		dailyWarningThreshold: 80,
		dailyCriticalThreshold: 95,
		hourlyWarningThreshold: 2500,
		predictiveAlertEnabled: true,
	};

	private constructor() {
		this.resetCountersIfNeeded();
		logger.info("YouTubeQuotaMonitor初期化完了", {
			dailyLimit: this.DAILY_QUOTA_LIMIT,
			hourlyLimit: this.HOURLY_QUOTA_LIMIT,
		});
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): YouTubeQuotaMonitor {
		if (!YouTubeQuotaMonitor.instance) {
			YouTubeQuotaMonitor.instance = new YouTubeQuotaMonitor();
		}
		return YouTubeQuotaMonitor.instance;
	}

	/**
	 * API操作のクォータ使用量を記録
	 */
	public recordQuotaUsage(operation: keyof typeof QUOTA_COSTS, quantity = 1): void {
		this.resetCountersIfNeeded();

		const cost = QUOTA_COSTS[operation] * quantity;

		this.dailyUsage += cost;
		this.hourlyUsage += cost;
		this.operationCount[operation] = (this.operationCount[operation] || 0) + quantity;

		logger.debug("YouTube APIクォータ使用記録", {
			operation,
			quantity,
			cost,
			dailyUsage: this.dailyUsage,
			hourlyUsage: this.hourlyUsage,
			dailyPercentage: Math.round((this.dailyUsage / this.DAILY_QUOTA_LIMIT) * 100),
		});

		// アラートチェック
		this.checkAlerts();
	}

	/**
	 * 詳細なクォータ使用量ログを出力
	 */
	public logQuotaUsage(
		operation: string,
		cost: number,
		additionalInfo?: Record<string, unknown>,
	): void {
		const stats = this.getUsageStats();

		logger.info("YouTube API使用量詳細", {
			operation,
			quotaCost: cost,
			dailyUsage: stats.dailyUsage,
			dailyPercentage: Math.round((stats.dailyUsage / this.DAILY_QUOTA_LIMIT) * 100),
			hourlyUsage: stats.hourlyUsage,
			estimatedRemaining: stats.estimatedRemaining,
			efficiencyScore: Math.round(stats.efficiencyScore * 100),
			timestamp: new Date().toISOString(),
			...additionalInfo,
		});
	}

	/**
	 * 操作実行前のクォータチェック
	 */
	public canExecuteOperation(operation: keyof typeof QUOTA_COSTS, quantity = 1): boolean {
		this.resetCountersIfNeeded();

		const requiredQuota = QUOTA_COSTS[operation] * quantity;
		const dailyRemaining = this.DAILY_QUOTA_LIMIT - this.dailyUsage;
		const hourlyRemaining = this.HOURLY_QUOTA_LIMIT - this.hourlyUsage;

		const canExecute = requiredQuota <= dailyRemaining && requiredQuota <= hourlyRemaining;

		if (!canExecute) {
			logger.warn("YouTube APIクォータ不足", {
				operation,
				requiredQuota,
				dailyRemaining,
				hourlyRemaining,
				reason: requiredQuota > dailyRemaining ? "daily_limit" : "hourly_limit",
			});
		}

		return canExecute;
	}

	/**
	 * 使用統計を取得
	 */
	public getUsageStats(): QuotaUsageStats {
		this.resetCountersIfNeeded();

		const efficiencyScore = this.calculateEfficiencyScore();

		return {
			dailyUsage: this.dailyUsage,
			hourlyUsage: this.hourlyUsage,
			lastReset: this.lastDayReset,
			operationBreakdown: { ...this.operationCount },
			estimatedRemaining: Math.max(0, this.DAILY_QUOTA_LIMIT - this.dailyUsage),
			efficiencyScore,
		};
	}

	/**
	 * クォータ効率性スコアを計算
	 */
	private calculateEfficiencyScore(): number {
		const totalOperations = Object.values(this.operationCount).reduce(
			(sum, count) => sum + count,
			0,
		);

		if (totalOperations === 0) return 1;

		// 効率的な操作の割合を計算
		const efficientOperations = [
			"videosWithSnippet",
			"videosWithStatistics",
			"videosWithContentDetails",
		];

		const efficientCount = efficientOperations.reduce(
			(sum, op) => sum + (this.operationCount[op] || 0),
			0,
		);

		// 検索操作は高コストなので効率性を下げる
		const searchCount = this.operationCount.search || 0;
		const searchPenalty = Math.min(searchCount * 0.1, 0.5);

		const baseScore = efficientCount / totalOperations;
		return Math.max(0, Math.min(1, baseScore - searchPenalty));
	}

	/**
	 * カウンターのリセット判定と実行
	 */
	private resetCountersIfNeeded(): void {
		const now = new Date();

		// 日次リセット（JST 0時基準）
		const todayJST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
		const lastResetJST = new Date(this.lastDayReset.getTime() + 9 * 60 * 60 * 1000);

		if (todayJST.getDate() !== lastResetJST.getDate()) {
			this.dailyUsage = 0;
			this.operationCount = {};
			this.lastDayReset = now;

			logger.info("YouTube APIクォータ日次リセット実行");
		}

		// 時間毎リセット
		if (now.getTime() - this.lastHourReset.getTime() >= 60 * 60 * 1000) {
			this.hourlyUsage = 0;
			this.lastHourReset = now;

			logger.debug("YouTube APIクォータ時間毎リセット実行");
		}
	}

	/**
	 * アラートチェック
	 */
	private checkAlerts(): void {
		const dailyPercentage = (this.dailyUsage / this.DAILY_QUOTA_LIMIT) * 100;

		// 日次クォータアラート
		if (dailyPercentage >= this.alertConfig.dailyCriticalThreshold) {
			logger.error("🚨 YouTube APIクォータ危険レベル", {
				dailyUsage: this.dailyUsage,
				percentage: Math.round(dailyPercentage),
				remaining: this.DAILY_QUOTA_LIMIT - this.dailyUsage,
				recommendation: "即座にAPI利用を制限してください",
			});
		} else if (dailyPercentage >= this.alertConfig.dailyWarningThreshold) {
			logger.warn("⚠️ YouTube APIクォータ警告レベル", {
				dailyUsage: this.dailyUsage,
				percentage: Math.round(dailyPercentage),
				remaining: this.DAILY_QUOTA_LIMIT - this.dailyUsage,
				recommendation: "API利用を慎重に管理してください",
			});
		}

		// 時間毎クォータアラート
		if (this.hourlyUsage >= this.alertConfig.hourlyWarningThreshold) {
			logger.warn("⏰ YouTube API時間毎クォータ警告", {
				hourlyUsage: this.hourlyUsage,
				limit: this.HOURLY_QUOTA_LIMIT,
				recommendation: "1時間の利用ペースを調整してください",
			});
		}

		// 予測アラート
		if (this.alertConfig.predictiveAlertEnabled) {
			this.checkPredictiveAlert();
		}
	}

	/**
	 * 予測アラートチェック
	 */
	private checkPredictiveAlert(): void {
		const hoursElapsed = (Date.now() - this.lastDayReset.getTime()) / (1000 * 60 * 60);

		if (hoursElapsed < 1) return; // 最初の1時間は予測しない

		const currentRate = this.dailyUsage / hoursElapsed;
		const predictedDailyUsage = currentRate * 24;

		if (predictedDailyUsage > this.DAILY_QUOTA_LIMIT * 0.9) {
			logger.warn("📈 YouTube APIクォータ超過予測", {
				currentRate: Math.round(currentRate),
				predictedDailyUsage: Math.round(predictedDailyUsage),
				limit: this.DAILY_QUOTA_LIMIT,
				recommendation: "API利用頻度の調整が必要です",
			});
		}
	}

	/**
	 * 最適な操作プランを提案
	 */
	public suggestOptimalOperations(targetVideoCount: number): {
		plan: string;
		estimatedCost: number;
		feasible: boolean;
		alternatives: string[];
	} {
		const remaining = this.DAILY_QUOTA_LIMIT - this.dailyUsage;

		// 最も効率的なプラン
		const searchCost = Math.ceil(targetVideoCount / 50) * QUOTA_COSTS.search;
		const detailsCost = targetVideoCount * QUOTA_COSTS.videosFullDetails;
		const totalCost = searchCost + detailsCost;

		const plan = `検索: ${searchCost}クォータ, 詳細取得: ${detailsCost}クォータ`;
		const feasible = totalCost <= remaining;

		const alternatives: string[] = [];

		if (!feasible) {
			// 代替プラン
			const basicDetailsCost = targetVideoCount * QUOTA_COSTS.videosWithSnippet;
			const alternativeCost = searchCost + basicDetailsCost;

			if (alternativeCost <= remaining) {
				alternatives.push("基本情報のみ取得（snippet部分のみ）");
			}

			const affordableVideos = Math.floor(remaining / 9); // 検索+基本詳細
			if (affordableVideos > 0) {
				alternatives.push(`対象を${affordableVideos}動画に削減`);
			}
		}

		return {
			plan,
			estimatedCost: totalCost,
			feasible,
			alternatives,
		};
	}

	/**
	 * レポート生成
	 */
	public generateDailyReport(): string {
		const stats = this.getUsageStats();
		const percentage = Math.round((stats.dailyUsage / this.DAILY_QUOTA_LIMIT) * 100);

		const report = [
			"📊 YouTube API Daily Report",
			"=".repeat(30),
			`使用量: ${stats.dailyUsage}/${this.DAILY_QUOTA_LIMIT} (${percentage}%)`,
			`残り: ${stats.estimatedRemaining}`,
			`効率性: ${Math.round(stats.efficiencyScore * 100)}%`,
			"",
			"操作別内訳:",
			...Object.entries(stats.operationBreakdown).map(([op, count]) => `  ${op}: ${count}回`),
		].join("\n");

		return report;
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getYouTubeQuotaMonitor(): YouTubeQuotaMonitor {
	return YouTubeQuotaMonitor.getInstance();
}

/**
 * クォータ使用量を記録するヘルパー関数
 */
export function recordQuotaUsage(operation: keyof typeof QUOTA_COSTS, quantity = 1): void {
	getYouTubeQuotaMonitor().recordQuotaUsage(operation, quantity);
}

/**
 * 操作実行可能性をチェックするヘルパー関数
 */
export function canExecuteOperation(operation: keyof typeof QUOTA_COSTS, quantity = 1): boolean {
	return getYouTubeQuotaMonitor().canExecuteOperation(operation, quantity);
}
