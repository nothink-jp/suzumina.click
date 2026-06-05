import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

import { ConfigManager, getConfig, isFeatureEnabled } from "../config-manager";

// 各テストでシングルトン状態をリセットし、テスト順序に依存させない
let mgr: ConfigManager;
beforeEach(() => {
	(ConfigManager as unknown as { instance: ConfigManager | undefined }).instance = undefined;
	mgr = ConfigManager.getInstance();
});

describe("ConfigManager: アクセサ", () => {
	it("各セクションはコピーを返す", () => {
		expect(typeof mgr.getFirestoreConfig().batchSize).toBe("number");
		expect(typeof mgr.getErrorHandlingConfig().debugMode).toBe("boolean");
		expect(typeof mgr.getPerformanceConfig().concurrency).toBe("number");
	});

	it("isFeatureEnabled は boolean を返す", () => {
		const key = Object.keys(mgr.getConfig().features)[0] as keyof ReturnType<
			typeof mgr.getConfig
		>["features"];
		expect(typeof mgr.isFeatureEnabled(key)).toBe("boolean");
	});

	it("ヘルパー関数 getConfig / isFeatureEnabled", () => {
		expect(getConfig().environment).toBeDefined();
		const key = Object.keys(getConfig().features)[0] as Parameters<typeof isFeatureEnabled>[0];
		expect(typeof isFeatureEnabled(key)).toBe("boolean");
	});
});

describe("ConfigManager: validateConfig", () => {
	it("既定設定は妥当", () => {
		expect(mgr.validateConfig().isValid).toBe(true);
	});

	it("不正値はすべてのエラーを列挙する", () => {
		mgr.updateSectionConfig("dlsite", { maxPagesPerExecution: 0, requestDelay: -1 });
		mgr.updateSectionConfig("youtube", { maxBatchSize: 99, dailyQuotaLimit: 1 });
		mgr.updateSectionConfig("firestore", { batchSize: 999 });
		mgr.updateSectionConfig("performance", { concurrency: 99 });

		const result = mgr.validateConfig();
		expect(result.isValid).toBe(false);
		expect(result.errors).toEqual(
			expect.arrayContaining([
				"DLsite maxPagesPerExecution must be at least 1",
				"DLsite requestDelay must be non-negative",
				"YouTube maxBatchSize cannot exceed 50 (API limit)",
				"YouTube dailyQuotaLimit seems too low",
				"Firestore batchSize cannot exceed 500",
				"Performance concurrency seems too high",
			]),
		);
	});
});

describe("ConfigManager: 更新", () => {
	it("updateSectionConfig はセクションをマージ更新する", () => {
		mgr.updateSectionConfig("dlsite", { maxPagesPerExecution: 7 });
		expect(mgr.getDLsiteConfig().maxPagesPerExecution).toBe(7);
		// 他フィールドは保持
		expect(typeof mgr.getDLsiteConfig().itemsPerPage).toBe("number");
	});

	it("updateConfig はネストを深くマージし lastUpdated を更新する", () => {
		mgr.updateConfig({ youtube: { maxPagesPerExecution: 3 } } as never);
		expect(mgr.getYouTubeConfig().maxPagesPerExecution).toBe(3);
		// 深いマージで他の youtube フィールドが消えない
		expect(typeof mgr.getYouTubeConfig().dailyQuotaLimit).toBe("number");
		expect(mgr.getConfig().lastUpdated).toBeDefined();
	});

	it("updateConfig: トップレベル primitive を更新し、undefined 値は既存を保持する", () => {
		const before = mgr.getYouTubeConfig().maxPagesPerExecution;
		mgr.updateConfig({
			version: "v-test", // トップレベル primitive
			youtube: { maxPagesPerExecution: undefined }, // undefined はスキップ（既存保持）
			// 既存に無いネストキー → deepMerge の `result[key] || {}` 分岐を通す
			extraSection: { nested: 1 },
		} as never);
		expect(mgr.getConfig().version).toBe("v-test");
		expect(mgr.getYouTubeConfig().maxPagesPerExecution).toBe(before);
		expect((mgr.getConfig() as Record<string, unknown>).extraSection).toEqual({ nested: 1 });
	});
});

describe("ConfigManager: getDebugInfo", () => {
	it("fullConfig・validation・environmentOverrides を含む", () => {
		const info = mgr.getDebugInfo();
		expect(info.fullConfig).toBeDefined();
		expect(info.validation).toHaveProperty("isValid");
		expect(info).toHaveProperty("environmentOverrides");
	});
});
