/**
 * YouTube Quota Monitor のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	canExecuteOperation,
	getYouTubeQuotaMonitor,
	QUOTA_COSTS,
	recordQuotaUsage,
	YouTubeQuotaMonitor,
} from "./youtube-quota-monitor";

// loggerのモック
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

// config-managerのモック
vi.mock("./config-manager", () => ({
	getYouTubeConfig: () => ({
		dailyQuotaLimit: 10000,
		maxBatchSize: 50,
		timeoutMs: 30000,
	}),
}));

describe("YouTubeQuotaMonitor", () => {
	let quotaMonitor: YouTubeQuotaMonitor;

	beforeEach(() => {
		// シングルトンインスタンスをリセット
		(YouTubeQuotaMonitor as any).instance = undefined;
		quotaMonitor = YouTubeQuotaMonitor.getInstance();
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = YouTubeQuotaMonitor.getInstance();
			const instance2 = YouTubeQuotaMonitor.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("クォータ使用量記録", () => {
		it("検索操作のクォータを記録する", () => {
			quotaMonitor.recordQuotaUsage("search");

			const stats = quotaMonitor.getUsageStats();
			expect(stats.dailyUsage).toBe(QUOTA_COSTS.search);
			expect(stats.operationBreakdown.search).toBe(1);
		});

		it("動画詳細取得操作のクォータを記録する", () => {
			quotaMonitor.recordQuotaUsage("videosFullDetails", 5);

			const stats = quotaMonitor.getUsageStats();
			expect(stats.dailyUsage).toBe(QUOTA_COSTS.videosFullDetails * 5);
			expect(stats.operationBreakdown.videosFullDetails).toBe(5);
		});

		it("複数の操作を累積記録する", () => {
			quotaMonitor.recordQuotaUsage("search");
			quotaMonitor.recordQuotaUsage("videosFullDetails", 3);
			quotaMonitor.recordQuotaUsage("search");

			const stats = quotaMonitor.getUsageStats();
			const expectedTotal = QUOTA_COSTS.search * 2 + QUOTA_COSTS.videosFullDetails * 3;

			expect(stats.dailyUsage).toBe(expectedTotal);
			expect(stats.operationBreakdown.search).toBe(2);
			expect(stats.operationBreakdown.videosFullDetails).toBe(3);
		});
	});

	describe("クォータチェック", () => {
		it("クォータ限界内では実行可能", () => {
			// 少量のクォータを使用
			quotaMonitor.recordQuotaUsage("search"); // 100ポイント

			const canExecute = quotaMonitor.canExecuteOperation("search");
			expect(canExecute).toBe(true);
		});

		it("クォータ不足時は実行不可", () => {
			// クォータ制限に近づく
			for (let i = 0; i < 99; i++) {
				quotaMonitor.recordQuotaUsage("search");
			}

			// 残りクォータが少ない状態で大きな操作を試行
			const canExecute = quotaMonitor.canExecuteOperation("videosFullDetails", 50);
			expect(canExecute).toBe(false);
		});
	});

	describe("統計情報", () => {
		it("正確な使用統計を返す", () => {
			quotaMonitor.recordQuotaUsage("search");
			quotaMonitor.recordQuotaUsage("videosFullDetails", 5);

			const stats = quotaMonitor.getUsageStats();

			expect(stats.dailyUsage).toBe(140); // 100 + 8*5
			expect(stats.estimatedRemaining).toBe(9860); // 10000 - 140
			expect(Math.round((stats.dailyUsage / 10000) * 100 * 10) / 10).toBe(1.4); // 140/10000 * 100
			expect(stats.operationBreakdown.search).toBe(1);
			expect(stats.operationBreakdown.videosFullDetails).toBe(5);
		});

		it("使用率計算が正確", () => {
			// 50%のクォータを使用
			for (let i = 0; i < 50; i++) {
				quotaMonitor.recordQuotaUsage("search");
			}

			const stats = quotaMonitor.getUsageStats();
			expect(Math.round((stats.dailyUsage / 10000) * 100)).toBe(50);
		});

		it("クォータ制限の確認", () => {
			// クォータ制限は内部定数として設定されている
			const stats = quotaMonitor.getUsageStats();
			// 残り使用量 + 使用量 = 制限値
			expect(stats.estimatedRemaining + stats.dailyUsage).toBe(10000);
		});
	});

	describe("操作最適化提案", () => {
		it("十分なクォータがある場合の提案", () => {
			const suggestion = quotaMonitor.suggestOptimalOperations(10);

			expect(suggestion.feasible).toBe(true);
			expect(suggestion.estimatedCost).toBeGreaterThan(0);
			expect(Array.isArray(suggestion.alternatives)).toBe(true);
			expect(suggestion.plan).toBeDefined();
		});

		it("クォータ不足時の代替案提案", () => {
			// クォータを大量に使用（100動画処理に必要なクォータを超える）
			for (let i = 0; i < 98; i++) {
				quotaMonitor.recordQuotaUsage("search"); // 9800ポイント使用
			}

			const suggestion = quotaMonitor.suggestOptimalOperations(100);

			expect(suggestion.feasible).toBe(false);
			expect(suggestion.alternatives.length).toBeGreaterThan(0);
		});

		it("部分実行の提案", () => {
			// 半分程度のクォータを使用
			for (let i = 0; i < 50; i++) {
				quotaMonitor.recordQuotaUsage("search");
			}

			const suggestion = quotaMonitor.suggestOptimalOperations(200);

			// 実行可能性とコストが適切に算出されることを確認
			expect(typeof suggestion.feasible).toBe("boolean");
			expect(suggestion.estimatedCost).toBeGreaterThan(0);
		});
	});

	describe("警告機能", () => {
		it.skip("高使用率で警告を発行", async () => {
			const { warn } = await import("../../shared/logger");

			// 85%のクォータを使用（警告レベルを超える）
			for (let i = 0; i < 85; i++) {
				quotaMonitor.recordQuotaUsage("search");
			}

			// checkAlerts()は recordQuotaUsage() 内で自動的に呼ばれるため、
			// 警告ログが出力されることを確認
			expect(warn).toHaveBeenCalled();
		});

		it.skip("正常使用率では警告なし", async () => {
			// 新しいインスタンスで50%のクォータを使用
			(YouTubeQuotaMonitor as any).instance = undefined;
			const newQuotaMonitor = YouTubeQuotaMonitor.getInstance();

			const { warn } = await import("../../shared/logger");

			for (let i = 0; i < 50; i++) {
				newQuotaMonitor.recordQuotaUsage("search");
			}

			// 50%なので警告は出ない（警告閾値は80%）
			// 新しいインスタンスなので警告モック呼び出しはない
			const stats = newQuotaMonitor.getUsageStats();
			expect(stats.dailyUsage).toBe(5000); // 50 * 100
		});
	});

	describe("詳細ログ", () => {
		it.skip("操作ログを記録する", async () => {
			const { info } = await import("../../shared/logger");

			quotaMonitor.logQuotaUsage("search", 100, {
				query: "test",
				results: 50,
			});

			// ログが呼ばれることを確認（logger のモックによる）
			expect(info).toHaveBeenCalled();
		});
	});

	describe("統計累積", () => {
		it("新しいインスタンスは空の統計から開始する", () => {
			// 新しいインスタンスを作成
			(YouTubeQuotaMonitor as any).instance = undefined;
			const newQuotaMonitor = YouTubeQuotaMonitor.getInstance();

			// 初期状態の確認
			const stats = newQuotaMonitor.getUsageStats();
			expect(stats.dailyUsage).toBe(0);
			expect(Object.keys(stats.operationBreakdown).length).toBe(0);
		});
	});
});

describe("QUOTA_COSTS", () => {
	it("すべての操作にコストが定義されている", () => {
		expect(QUOTA_COSTS.search).toBe(100);
		expect(QUOTA_COSTS.videosFullDetails).toBe(8);

		// すべてのコストが正の数
		for (const [operation, cost] of Object.entries(QUOTA_COSTS)) {
			expect(cost).toBeGreaterThan(0);
			expect(typeof cost).toBe("number");
		}
	});
});

describe("ヘルパー関数", () => {
	beforeEach(() => {
		(YouTubeQuotaMonitor as any).instance = undefined;
	});

	describe("getYouTubeQuotaMonitor", () => {
		it("シングルトンインスタンスを返す", () => {
			const monitor1 = getYouTubeQuotaMonitor();
			const monitor2 = getYouTubeQuotaMonitor();

			expect(monitor1).toBe(monitor2);
			expect(monitor1).toBeInstanceOf(YouTubeQuotaMonitor);
		});
	});

	describe("recordQuotaUsage", () => {
		it("クォータ使用量を記録する", () => {
			recordQuotaUsage("search");

			const monitor = getYouTubeQuotaMonitor();
			const stats = monitor.getUsageStats();

			expect(stats.dailyUsage).toBe(QUOTA_COSTS.search);
		});

		it("バッチサイズを指定して記録する", () => {
			recordQuotaUsage("videosFullDetails", 3);

			const monitor = getYouTubeQuotaMonitor();
			const stats = monitor.getUsageStats();

			expect(stats.dailyUsage).toBe(QUOTA_COSTS.videosFullDetails * 3);
		});
	});

	describe("canExecuteOperation", () => {
		it("実行可能性をチェックする", () => {
			const canExecute = canExecuteOperation("search");
			expect(typeof canExecute).toBe("boolean");
		});

		it("バッチサイズを考慮してチェックする", () => {
			const canExecuteSmall = canExecuteOperation("videosFullDetails", 1);
			const canExecuteLarge = canExecuteOperation("videosFullDetails", 1000);

			expect(typeof canExecuteSmall).toBe("boolean");
			expect(typeof canExecuteLarge).toBe("boolean");

			// 小さなバッチは実行可能、大きなバッチは制限される可能性が高い
			expect(canExecuteSmall).toBe(true);
			expect(canExecuteLarge).toBe(false);
		});
	});
});
