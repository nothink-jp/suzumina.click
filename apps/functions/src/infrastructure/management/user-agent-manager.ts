/**
 * User-Agent管理システム
 *
 * DLsiteスクレイピングの検出回避のためのUser-Agentローテーション機能を提供します。
 * 複数のブラウザパターンを使用してリクエストを分散させ、
 * アクセスパターンの検出を回避します。
 */

import * as logger from "../../shared/logger";

/**
 * User-Agent設定
 */
interface UserAgentConfig {
	agent: string;
	platform: string;
	browser: string;
	version: string;
	lastUsed: number;
	useCount: number;
}

/**
 * User-Agent統計情報
 */
interface UserAgentStats {
	totalRequests: number;
	agentDistribution: Record<string, number>;
	lastRotation: number;
	detectionRisk: "low" | "medium" | "high";
}

/**
 * User-Agent管理クラス（シングルトン）
 */
export class UserAgentManager {
	private static instance: UserAgentManager;
	private stats: UserAgentStats;
	private readonly configs: UserAgentConfig[];
	private readonly rotationThreshold = 3; // 同一User-Agentの連続使用制限を削減
	private readonly cooldownPeriod = 30000; // クールダウン期間を30秒に短縮

	private constructor() {
		this.configs = this.initializeUserAgents();
		this.stats = {
			totalRequests: 0,
			agentDistribution: {},
			lastRotation: Date.now(),
			detectionRisk: "low",
		};

		logger.debug("UserAgentManager初期化完了", {
			agentCount: this.configs.length,
			rotationThreshold: this.rotationThreshold,
		});
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): UserAgentManager {
		if (!UserAgentManager.instance) {
			UserAgentManager.instance = new UserAgentManager();
		}
		return UserAgentManager.instance;
	}

	/**
	 * User-Agent設定を初期化（拡張版）
	 */
	private initializeUserAgents(): UserAgentConfig[] {
		return [
			// Chrome バリエーション
			{
				agent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				platform: "Windows",
				browser: "Chrome",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
				platform: "Windows",
				browser: "Chrome",
				version: "119",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				platform: "macOS",
				browser: "Chrome",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
				platform: "macOS",
				browser: "Chrome",
				version: "119",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				platform: "Linux",
				browser: "Chrome",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
				platform: "Linux",
				browser: "Chrome",
				version: "119",
				lastUsed: 0,
				useCount: 0,
			},
			// Firefox バリエーション
			{
				agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
				platform: "Windows",
				browser: "Firefox",
				version: "121",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
				platform: "Windows",
				browser: "Firefox",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
				platform: "macOS",
				browser: "Firefox",
				version: "121",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
				platform: "macOS",
				browser: "Firefox",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
				platform: "Linux",
				browser: "Firefox",
				version: "121",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent: "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
				platform: "Linux",
				browser: "Firefox",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			// Safari バリエーション
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
				platform: "macOS",
				browser: "Safari",
				version: "17.2",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
				platform: "macOS",
				browser: "Safari",
				version: "17.1",
				lastUsed: 0,
				useCount: 0,
			},
			// Edge バリエーション
			{
				agent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
				platform: "Windows",
				browser: "Edge",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
				platform: "Windows",
				browser: "Edge",
				version: "119",
				lastUsed: 0,
				useCount: 0,
			},
			// モバイルUser-Agent（参考）
			{
				agent:
					"Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
				platform: "iOS",
				browser: "Safari",
				version: "17.2",
				lastUsed: 0,
				useCount: 0,
			},
			{
				agent:
					"Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
				platform: "Android",
				browser: "Chrome",
				version: "120",
				lastUsed: 0,
				useCount: 0,
			},
		];
	}

	/**
	 * 次のUser-Agentを取得
	 */
	public getNextUserAgent(): string {
		const selectedConfig = this.selectOptimalUserAgent();

		// 使用統計を更新
		this.updateUsageStats(selectedConfig);

		// 検出リスクを評価
		this.evaluateDetectionRisk();

		logger.debug("User-Agent選択", {
			browser: selectedConfig.browser,
			platform: selectedConfig.platform,
			useCount: selectedConfig.useCount,
			detectionRisk: this.stats.detectionRisk,
		});

		return selectedConfig.agent;
	}

	/**
	 * 最適なUser-Agentを選択（改良版）
	 */
	private selectOptimalUserAgent(): UserAgentConfig {
		const now = Date.now();

		// クールダウン中のUser-Agentを除外
		const availableConfigs = this.configs.filter(
			(config) => now - config.lastUsed > this.cooldownPeriod,
		);

		if (availableConfigs.length === 0) {
			// 全てクールダウン中の場合は最も古いものを使用（緊急時）
			const oldestConfig = this.configs.reduce((oldest, current) =>
				current.lastUsed < oldest.lastUsed ? current : oldest,
			);

			// 緊急時は警告レベルを下げてログの頻度を削減
			if (this.stats.totalRequests % 50 === 0) {
				// 50リクエストごとに1回だけログ
				logger.info(`緊急時User-Agent使用 (${this.stats.totalRequests}回目)`, {
					selectedBrowser: oldestConfig.browser,
					availableAgents: this.configs.length,
					totalRequests: this.stats.totalRequests,
				});
			}
			return oldestConfig;
		}

		// 使用回数の少ないものを優先
		const sortedConfigs = availableConfigs.sort((a, b) => {
			// 使用回数が同じ場合は最終使用時刻が古いものを優先
			if (a.useCount === b.useCount) {
				return a.lastUsed - b.lastUsed;
			}
			return a.useCount - b.useCount;
		});

		const selectedConfig = sortedConfigs[0];
		if (!selectedConfig) {
			throw new Error("No User-Agent configuration available");
		}
		return selectedConfig;
	}

	/**
	 * 使用統計を更新
	 */
	private updateUsageStats(config: UserAgentConfig): void {
		const now = Date.now();

		config.lastUsed = now;
		config.useCount++;

		this.stats.totalRequests++;
		this.stats.lastRotation = now;

		const agentKey = `${config.browser}-${config.platform}`;
		this.stats.agentDistribution[agentKey] = (this.stats.agentDistribution[agentKey] || 0) + 1;
	}

	/**
	 * 検出リスクを評価（改良版）
	 */
	private evaluateDetectionRisk(): void {
		const maxUseCount = Math.max(...this.configs.map((c) => c.useCount));
		const minUseCount = Math.min(...this.configs.map((c) => c.useCount));
		const usageVariance = maxUseCount - minUseCount;

		// より緩やかなリスク評価ロジック（User-Agent数が増えたため）
		if (usageVariance > 20) {
			this.stats.detectionRisk = "high";
		} else if (usageVariance > 10) {
			this.stats.detectionRisk = "medium";
		} else {
			this.stats.detectionRisk = "low";
		}

		// 高リスク時のみ警告（頻度を削減）
		if (this.stats.detectionRisk === "high" && this.stats.totalRequests % 100 === 0) {
			logger.warn(`User-Agent検出リスク高 (${this.stats.totalRequests}回目)`, {
				maxUseCount,
				minUseCount,
				usageVariance,
				totalAgents: this.configs.length,
				recommendation: "大量処理中につき継続監視",
			});
		}
	}

	/**
	 * 統計情報を取得
	 */
	public getStats(): UserAgentStats {
		return { ...this.stats };
	}

	/**
	 * 使用回数をリセット
	 */
	public resetUsageStats(): void {
		this.configs.forEach((config) => {
			config.useCount = 0;
			config.lastUsed = 0;
		});

		this.stats = {
			totalRequests: 0,
			agentDistribution: {},
			lastRotation: Date.now(),
			detectionRisk: "low",
		};

		logger.info("User-Agent使用統計をリセットしました");
	}

	/**
	 * 完全なHTTPヘッダーセットを生成
	 */
	public generateHeaders(referer?: string): Record<string, string> {
		const userAgent = this.getNextUserAgent();
		const config = this.configs.find((c) => c.agent === userAgent);
		if (!config) {
			throw new Error(`User agent configuration not found for: ${userAgent}`);
		}

		// ブラウザ固有のヘッダーを生成
		const headers: Record<string, string> = {
			"User-Agent": userAgent,
			Accept: this.getAcceptHeader(config.browser),
			"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			"Accept-Encoding": "gzip, deflate, br",
			"Cache-Control": "no-cache",
			Pragma: "no-cache",
			"Upgrade-Insecure-Requests": "1",
		};

		// ブラウザ固有のヘッダーを追加
		if (config.browser === "Chrome" || config.browser === "Edge") {
			headers["Sec-Ch-Ua"] =
				`"Not_A Brand";v="8", "Chromium";v="${config.version}", "${config.browser}";v="${config.version}"`;
			headers["Sec-Ch-Ua-Mobile"] = "?0";
			headers["Sec-Ch-Ua-Platform"] = `"${config.platform}"`;
			headers["Sec-Fetch-Dest"] = "document";
			headers["Sec-Fetch-Mode"] = "navigate";
			headers["Sec-Fetch-Site"] = referer ? "same-origin" : "none";
		}

		if (referer) {
			headers.Referer = referer;
		}

		return headers;
	}

	/**
	 * ブラウザ別のAcceptヘッダーを取得
	 */
	private getAcceptHeader(browser: string): string {
		switch (browser) {
			case "Firefox":
				return "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
			case "Safari":
				return "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
			default:
				return "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8";
		}
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getUserAgentManager(): UserAgentManager {
	return UserAgentManager.getInstance();
}

/**
 * User-Agentを取得するヘルパー関数
 */
export function getNextUserAgent(): string {
	return getUserAgentManager().getNextUserAgent();
}

/**
 * 完全なHTTPヘッダーセットを生成するヘルパー関数
 */
export function generateDLsiteHeaders(referer?: string): Record<string, string> {
	return getUserAgentManager().generateHeaders(referer);
}

/**
 * User-Agent使用統計のサマリーを出力（大量処理完了時用）
 */
export function logUserAgentSummary(): void {
	const manager = getUserAgentManager();
	const stats = manager.getStats();

	logger.info("📊 User-Agent使用統計サマリー", {
		totalRequests: stats.totalRequests,
		detectionRisk: stats.detectionRisk,
		distribution: stats.agentDistribution,
		recommendation: stats.detectionRisk === "high" ? "次回実行前にリセット推奨" : "継続利用可能",
	});
}
