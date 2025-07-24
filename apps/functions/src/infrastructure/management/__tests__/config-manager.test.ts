/**
 * Config Manager のテスト
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ConfigManager, getDLsiteConfig, getYouTubeConfig } from "../config-manager";

// 環境変数のモック
const originalEnv = process.env;

describe("ConfigManager", () => {
	let configManager: ConfigManager;

	beforeEach(() => {
		// 環境変数をリセット
		process.env = { ...originalEnv };
		// シングルトンインスタンスをリセット
		(ConfigManager as any).instance = undefined;
		configManager = ConfigManager.getInstance();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = ConfigManager.getInstance();
			const instance2 = ConfigManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("DLsite設定", () => {
		it("デフォルト設定を返す", () => {
			const config = configManager.getDLsiteConfig();

			expect(config.maxPagesPerExecution).toBe(1);
			expect(config.itemsPerPage).toBe(100);
			expect(config.requestDelay).toBe(1000);
			expect(config.timeoutMs).toBe(30000);
		});

		it("環境変数で設定をオーバーライドする", () => {
			process.env.DLSITE_MAX_PAGES = "5";
			process.env.DLSITE_REQUEST_DELAY = "2000";

			// 新しいインスタンスを作成
			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const config = newConfigManager.getDLsiteConfig();

			expect(config.maxPagesPerExecution).toBe(5);
			expect(config.requestDelay).toBe(2000);
			expect(config.timeoutMs).toBe(30000); // デフォルト値
		});

		it("無効な環境変数値の場合はNaNになる（実装の現状）", () => {
			process.env.DLSITE_MAX_PAGES = "invalid";
			process.env.DLSITE_REQUEST_DELAY = "not-a-number";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const config = newConfigManager.getDLsiteConfig();

			expect(config.maxPagesPerExecution).toBeNaN();
			expect(config.requestDelay).toBeNaN();
		});
	});

	describe("YouTube設定", () => {
		it("デフォルト設定を返す", () => {
			const config = configManager.getYouTubeConfig();

			expect(config.maxBatchSize).toBe(50);
			expect(config.dailyQuotaLimit).toBe(10000);
			expect(config.timeoutMs).toBe(30000);
		});

		it("環境変数で設定をオーバーライドする", () => {
			process.env.YOUTUBE_MAX_PAGES = "3";
			process.env.YOUTUBE_QUOTA_LIMIT = "5000";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const config = newConfigManager.getYouTubeConfig();

			expect(config.maxPagesPerExecution).toBe(3);
			expect(config.dailyQuotaLimit).toBe(5000);
			expect(config.timeoutMs).toBe(30000); // デフォルト値
		});

		it("クォータ監視が正しく設定される", () => {
			process.env.DISABLE_QUOTA_MONITORING = "true";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();

			// 機能フラグで確認
			expect(newConfigManager.isFeatureEnabled("youtubeQuotaMonitoring")).toBe(false);
		});
	});

	describe("エラーハンドリング設定", () => {
		it("本番環境では適切なログレベルを設定する", () => {
			process.env.NODE_ENV = "production";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const config = newConfigManager.getErrorHandlingConfig();

			expect(config.logLevel).toBe("WARN");
			expect(config.debugMode).toBe(false);
		});

		it("開発環境では詳細ログを有効にする", () => {
			process.env.NODE_ENV = "development";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const config = newConfigManager.getErrorHandlingConfig();

			expect(config.logLevel).toBe("DEBUG");
			expect(config.debugMode).toBe(true);
		});
	});

	describe("設定の取得", () => {
		it("設定概要を取得できる", () => {
			const summary = configManager.getConfigSummary();

			expect(summary.environment).toBeDefined();
			expect(summary.version).toBeDefined();
			expect(summary.dlsite).toBeDefined();
			expect(summary.youtube).toBeDefined();
		});

		it("環境変数の影響を確認できる", () => {
			process.env.NODE_ENV = "test";

			(ConfigManager as any).instance = undefined;
			const newConfigManager = ConfigManager.getInstance();
			const summary = newConfigManager.getConfigSummary();

			expect(summary.environment).toBe("test");
		});
	});
});

describe("ヘルパー関数", () => {
	beforeEach(() => {
		process.env = { ...originalEnv };
		(ConfigManager as any).instance = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("getDLsiteConfig", () => {
		it("DLsite設定を正しく取得する", () => {
			const config = getDLsiteConfig();
			expect(config.maxPagesPerExecution).toBeDefined();
			expect(config.itemsPerPage).toBeDefined();
			expect(config.requestDelay).toBeDefined();
		});
	});

	describe("getYouTubeConfig", () => {
		it("YouTube設定を正しく取得する", () => {
			const config = getYouTubeConfig();
			expect(config.maxBatchSize).toBeDefined();
			expect(config.dailyQuotaLimit).toBeDefined();
			expect(config.timeoutMs).toBeDefined();
		});
	});
});
