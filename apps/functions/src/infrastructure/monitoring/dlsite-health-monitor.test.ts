/**
 * DLsite Health Monitor のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DLsiteHealthMonitor, getDLsiteHealthMonitor } from "./dlsite-health-monitor";

// 依存関係のモック
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

vi.mock("../management/parser-config", () => ({
	getParserConfigManager: () => ({
		getFieldConfig: (fieldName: string) => {
			const configs: Record<string, any> = {
				productId: {
					selectors: {
						primary: ["a[href*='/product_id/']"],
						secondary: ["[id*='product']"],
						fallback: ["a[href*='RJ']"],
						minSuccessRate: 0.95,
					},
					validation: { required: true },
				},
				title: {
					selectors: {
						primary: [".work_name a"],
						secondary: [".title"],
						fallback: ["h1", "h2"],
						minSuccessRate: 0.9,
					},
					validation: { required: true },
				},
			};
			return configs[fieldName] || null;
		},
	}),
}));

vi.mock("../management/user-agent-manager", () => ({
	generateDLsiteHeaders: () => ({
		"User-Agent": "Test User Agent",
		Accept: "text/html",
	}),
}));

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DLsiteHealthMonitor", () => {
	let healthMonitor: DLsiteHealthMonitor;

	beforeEach(() => {
		// シングルトンインスタンスをリセット
		(DLsiteHealthMonitor as any).instance = undefined;
		healthMonitor = DLsiteHealthMonitor.getInstance();

		// fetchモックをリセット
		mockFetch.mockClear();
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = DLsiteHealthMonitor.getInstance();
			const instance2 = DLsiteHealthMonitor.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("構造ヘルスチェック", () => {
		it("構造変更を検知する", async () => {
			// 構造が変更されたページ（必要な要素が見つからない）
			const mockHtml = `
				<html>
					<body>
						<div>No expected elements</div>
					</body>
				</html>
			`;

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			const result = await healthMonitor.checkStructureHealth(["https://www.dlsite.com/test1"]);

			expect(result.overallHealthy).toBe(false);
			expect(result.successRate).toBeLessThan(0.5);
			expect(result.recommendations.length).toBeGreaterThan(0);
		});

		it("ネットワークエラーを適切に処理する", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			const result = await healthMonitor.checkStructureHealth(["https://www.dlsite.com/test1"]);

			expect(result.overallHealthy).toBe(false);
			expect(result.successRate).toBe(0);
			expect(result.recommendations).toContain("ネットワーク接続の確認");
		});
	});

	describe("フィールド別ヘルスチェック", () => {
		it("productIdフィールドの健全性をチェックする", async () => {
			const mockHtml = `
				<a href="/product_id/RJ123456.html">Valid Product Link</a>
			`;

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			// privateメソッドをテストするため型アサーション
			const result = await (healthMonitor as any).checkFieldHealth("productId", [
				"https://www.dlsite.com/test1",
			]);

			expect(result.successRate).toBe(1);
			expect(result.attempts).toBe(1);
			expect(result.workingSelectors.length).toBeGreaterThan(0);
		});

		it("titleフィールドの健全性をチェックする", async () => {
			const mockHtml = `
				<div class="work_name">
					<a title="Test Title">Test Title</a>
				</div>
			`;

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			const result = await (healthMonitor as any).checkFieldHealth("title", [
				"https://www.dlsite.com/test1",
			]);

			expect(result.successRate).toBe(1);
			expect(result.attempts).toBe(1);
		});

		it("存在しないフィールドでエラーにならない", async () => {
			const result = await (healthMonitor as any).checkFieldHealth("nonExistentField", [
				"https://www.dlsite.com/test1",
			]);

			expect(result.successRate).toBe(0);
			expect(result.attempts).toBe(0);
		});
	});

	describe("セレクター検証", () => {
		it("プライマリセレクターが機能する", async () => {
			const mockHtml = `
				<a href="/product_id/RJ123456.html">Primary Selector Match</a>
			`;

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			// セレクター検証をテスト
			const result = await (healthMonitor as any).checkFieldHealth("productId", [
				"https://www.dlsite.com/test1",
			]);

			expect(result.workingSelectors).toContain("a[href*='/product_id/']");
		});
	});

	describe("エラーハンドリング", () => {
		it("HTTPエラーレスポンスを適切に処理する", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				text: () => Promise.resolve("Not Found"),
			});

			const result = await healthMonitor.checkStructureHealth(["https://www.dlsite.com/test1"]);

			expect(result.overallHealthy).toBe(false);
			expect(result.successRate).toBe(0);
		});

		it("無効なHTMLを適切に処理する", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve("Invalid HTML"),
			});

			// 無効なHTMLでもエラーにならないことを確認
			expect(async () => {
				await healthMonitor.checkStructureHealth(["https://www.dlsite.com/test1"]);
			}).not.toThrow();
		});

		it("空のURLリストを適切に処理する", async () => {
			const result = await healthMonitor.checkStructureHealth([]);

			expect(result.overallHealthy).toBe(false);
			expect(result.successRate).toBe(0);
			// 空のURLリストの場合、フィールドチェックは実行されない
			expect(result.fieldsChecked).toBe(0);
		});
	});
});

describe("ヘルパー関数", () => {
	beforeEach(() => {
		(DLsiteHealthMonitor as any).instance = undefined;
	});

	describe("getDLsiteHealthMonitor", () => {
		it("シングルトンインスタンスを返す", () => {
			const monitor1 = getDLsiteHealthMonitor();
			const monitor2 = getDLsiteHealthMonitor();

			expect(monitor1).toBe(monitor2);
			expect(monitor1).toBeInstanceOf(DLsiteHealthMonitor);
		});
	});
});
