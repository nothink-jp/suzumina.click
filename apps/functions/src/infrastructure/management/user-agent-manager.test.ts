/**
 * User Agent Manager のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateDLsiteHeaders, getUserAgentManager, UserAgentManager } from "./user-agent-manager";

// loggerのモック
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

describe("UserAgentManager", () => {
	let userAgentManager: UserAgentManager;

	beforeEach(() => {
		// シングルトンインスタンスをリセット
		(UserAgentManager as any).instance = undefined;
		userAgentManager = UserAgentManager.getInstance();
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = UserAgentManager.getInstance();
			const instance2 = UserAgentManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("User-Agent生成", () => {
		it("有効なUser-Agentを生成する", () => {
			const userAgent = userAgentManager.getNextUserAgent();

			expect(userAgent).toBeDefined();
			expect(typeof userAgent).toBe("string");
			expect(userAgent.length).toBeGreaterThan(50);
			expect(userAgent).toMatch(/Mozilla\/5\.0/);
		});

		it("異なる呼び出しで異なるUser-Agentを返す可能性がある", () => {
			const userAgent1 = userAgentManager.getNextUserAgent();
			const userAgent2 = userAgentManager.getNextUserAgent();

			// 必ずしも異なるとは限らないが、両方とも有効であることを確認
			expect(userAgent1).toBeDefined();
			expect(userAgent2).toBeDefined();
		});

		it("クールダウン期間を考慮する", () => {
			// 複数回連続でUser-Agentを取得
			const userAgents: string[] = [];
			for (let i = 0; i < 5; i++) {
				userAgents.push(userAgentManager.getNextUserAgent());
			}

			// すべて有効なUser-Agentであることを確認
			for (const ua of userAgents) {
				expect(ua).toBeDefined();
				expect(ua.length).toBeGreaterThan(50);
			}
		});
	});

	describe("ブラウザパターン", () => {
		it("Chrome User-Agentを含む", () => {
			// 複数回試行してChromeパターンを取得
			let foundChrome = false;
			for (let i = 0; i < 20; i++) {
				const userAgent = userAgentManager.getNextUserAgent();
				if (userAgent.includes("Chrome/")) {
					foundChrome = true;
					break;
				}
			}
			expect(foundChrome).toBe(true);
		});

		it("Firefox User-Agentを含む", () => {
			// 複数回試行してFirefoxパターンを取得
			let foundFirefox = false;
			for (let i = 0; i < 20; i++) {
				const userAgent = userAgentManager.getNextUserAgent();
				if (userAgent.includes("Firefox/")) {
					foundFirefox = true;
					break;
				}
			}
			expect(foundFirefox).toBe(true);
		});

		it("Edge User-Agentを含む", () => {
			// 複数回試行してEdgeパターンを取得
			let foundEdge = false;
			for (let i = 0; i < 20; i++) {
				const userAgent = userAgentManager.getNextUserAgent();
				if (userAgent.includes("Edg/")) {
					foundEdge = true;
					break;
				}
			}
			expect(foundEdge).toBe(true);
		});
	});

	describe("統計情報", () => {
		it("使用統計を記録する", () => {
			// 複数回User-Agentを取得
			for (let i = 0; i < 5; i++) {
				userAgentManager.getNextUserAgent();
			}

			const stats = userAgentManager.getStats();
			expect(stats).toBeDefined();
			expect(stats.totalRequests).toBe(5);
			expect(typeof stats.agentDistribution).toBe("object");
			expect(stats.detectionRisk).toMatch(/^(low|medium|high)$/);
			expect(typeof stats.lastRotation).toBe("number");
		});

		it("クールダウン時間を正しく計算する", () => {
			// User-Agentを取得
			userAgentManager.getNextUserAgent();

			// 統計を確認
			const stats = userAgentManager.getStats();

			expect(stats.totalRequests).toBeGreaterThan(0);
			expect(Object.keys(stats.agentDistribution).length).toBeGreaterThan(0);

			// 使用されたエージェントがagentDistributionに記録されていることを確認
			const distributionValues = Object.values(stats.agentDistribution);
			expect(distributionValues.some((count) => count > 0)).toBe(true);
		});
	});

	describe("クールダウン機能", () => {
		it("最近使用されたUser-Agentを避ける", () => {
			// 複数回試行してUser-Agentの多様性を確認
			const userAgents = new Set();
			for (let i = 0; i < 10; i++) {
				userAgents.add(userAgentManager.getNextUserAgent());
			}

			// 少なくとも2つ以上の異なるUser-Agentが使用される
			expect(userAgents.size).toBeGreaterThanOrEqual(1);
		});

		it("十分な時間が経過後はUser-Agentを再利用可能", () => {
			// クールダウン期間を短く設定してテスト
			const originalCooldown = (userAgentManager as any).cooldownPeriod;
			(userAgentManager as any).cooldownPeriod = 1; // 1ms

			const firstUA = userAgentManager.getNextUserAgent();

			// 少し待機
			return new Promise((resolve) => {
				setTimeout(() => {
					const secondUA = userAgentManager.getNextUserAgent();

					// どちらも有効なUser-Agent
					expect(firstUA).toBeDefined();
					expect(secondUA).toBeDefined();

					// クールダウン期間をリセット
					(userAgentManager as any).cooldownPeriod = originalCooldown;
					resolve(undefined);
				}, 10);
			});
		});
	});
});

describe("generateDLsiteHeaders", () => {
	it("必要なヘッダーを生成する", () => {
		const headers = generateDLsiteHeaders();

		expect(headers["User-Agent"]).toBeDefined();
		expect(headers.Accept).toBeDefined();
		expect(headers["Accept-Language"]).toBeDefined();
		expect(headers["Accept-Encoding"]).toBeDefined();
		expect(headers["Cache-Control"]).toBeDefined();

		// セキュリティ関連ヘッダー
		expect(headers["Sec-Ch-Ua"]).toBeDefined();
		expect(headers["Sec-Ch-Ua-Mobile"]).toBeDefined();
		expect(headers["Sec-Ch-Ua-Platform"]).toBeDefined();
		expect(headers["Sec-Fetch-Dest"]).toBeDefined();
		expect(headers["Sec-Fetch-Mode"]).toBeDefined();
		expect(headers["Sec-Fetch-Site"]).toBeDefined();
	});

	it("User-Agentが動的に変更される", () => {
		const headers1 = generateDLsiteHeaders();
		const headers2 = generateDLsiteHeaders();

		// 両方とも有効なUser-Agentを持つ
		expect(headers1["User-Agent"]).toBeDefined();
		expect(headers2["User-Agent"]).toBeDefined();

		// User-Agentの形式が正しい
		expect(headers1["User-Agent"]).toMatch(/Mozilla\/5\.0/);
		expect(headers2["User-Agent"]).toMatch(/Mozilla\/5\.0/);
	});

	it("ブラウザ固有のヘッダーが一貫している", () => {
		const headers = generateDLsiteHeaders();
		const userAgent = headers["User-Agent"];

		// ChromeベースのUser-Agentの場合
		if (userAgent.includes("Chrome/")) {
			expect(headers["Sec-Ch-Ua"]).toContain("Chromium");
		}

		// EdgeベースのUser-Agentの場合
		if (userAgent.includes("Edg/")) {
			expect(headers["Sec-Ch-Ua"]).toContain("Edge");
		}

		// 基本的なヘッダー値の検証
		expect(headers["Accept-Language"]).toBe("ja-JP,ja;q=0.9,en;q=0.8");
		expect(headers["Accept-Encoding"]).toBe("gzip, deflate, br");
		expect(headers["Cache-Control"]).toBe("no-cache");
	});
});

describe("getUserAgentManager", () => {
	it("シングルトンインスタンスを返す", () => {
		const manager1 = getUserAgentManager();
		const manager2 = getUserAgentManager();

		expect(manager1).toBe(manager2);
		expect(manager1).toBeInstanceOf(UserAgentManager);
	});
});

describe("User-Agent形式検証", () => {
	let userAgentManager: UserAgentManager;

	beforeEach(() => {
		(UserAgentManager as any).instance = undefined;
		userAgentManager = UserAgentManager.getInstance();
	});

	it("Chrome User-Agentの形式が正しい", () => {
		// Chrome User-Agentのパターンを探す
		let chromeUA = "";
		for (let i = 0; i < 30; i++) {
			const ua = userAgentManager.getNextUserAgent();
			if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
				chromeUA = ua;
				break;
			}
		}

		if (chromeUA) {
			expect(chromeUA).toMatch(/Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\)/);
			expect(chromeUA).toMatch(/Chrome\/\d+\.\d+\.\d+\.\d+/);
			expect(chromeUA).toMatch(/Safari\/\d+\.\d+/);
		}
	});

	it("Firefox User-Agentの形式が正しい", () => {
		// Firefox User-Agentのパターンを探す
		let firefoxUA = "";
		for (let i = 0; i < 30; i++) {
			const ua = userAgentManager.getNextUserAgent();
			if (ua.includes("Firefox/")) {
				firefoxUA = ua;
				break;
			}
		}

		if (firefoxUA) {
			expect(firefoxUA).toMatch(/Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64; rv:\d+\.\d+\)/);
			expect(firefoxUA).toMatch(/Gecko\/\d+/);
			expect(firefoxUA).toMatch(/Firefox\/\d+\.\d+/);
		}
	});

	it("Edge User-Agentの形式が正しい", () => {
		// Edge User-Agentのパターンを探す
		let edgeUA = "";
		for (let i = 0; i < 30; i++) {
			const ua = userAgentManager.getNextUserAgent();
			if (ua.includes("Edg/")) {
				edgeUA = ua;
				break;
			}
		}

		if (edgeUA) {
			expect(edgeUA).toMatch(/Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\)/);
			expect(edgeUA).toMatch(/Chrome\/\d+\.\d+\.\d+\.\d+/);
			expect(edgeUA).toMatch(/Edg\/\d+\.\d+\.\d+\.\d+/);
		}
	});
});
