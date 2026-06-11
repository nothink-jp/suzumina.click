import { afterEach, describe, expect, it, vi } from "vitest";

// isProduction はモジュール読み込み時に確定するため、env を差し替えて再 import する
async function loadConfig(env: { NODE_ENV?: string; DLSITE_REQUEST_DELAY?: string }) {
	vi.resetModules();
	if (env.NODE_ENV !== undefined) {
		vi.stubEnv("NODE_ENV", env.NODE_ENV);
	}
	if (env.DLSITE_REQUEST_DELAY !== undefined) {
		vi.stubEnv("DLSITE_REQUEST_DELAY", env.DLSITE_REQUEST_DELAY);
	}
	return import("../config-manager");
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("config-manager の実効値（SPR-189）", () => {
	it("production: requestDelay=500 / timeoutMs=30000（本番実効値を正とする）", async () => {
		const { getDLsiteConfig } = await loadConfig({ NODE_ENV: "production" });
		expect(getDLsiteConfig()).toEqual({ requestDelay: 500, timeoutMs: 30000 });
	});

	it("production 以外(dev): requestDelay=2000", async () => {
		const { getDLsiteConfig } = await loadConfig({ NODE_ENV: "development" });
		expect(getDLsiteConfig().requestDelay).toBe(2000);
	});

	it("DLSITE_REQUEST_DELAY env で上書きできる", async () => {
		const { getDLsiteConfig } = await loadConfig({
			NODE_ENV: "production",
			DLSITE_REQUEST_DELAY: "777",
		});
		expect(getDLsiteConfig().requestDelay).toBe(777);
	});

	it("getYouTubeConfig: maxBatchSize=50（API 上限）", async () => {
		const { getYouTubeConfig } = await loadConfig({ NODE_ENV: "production" });
		expect(getYouTubeConfig()).toEqual({ maxBatchSize: 50 });
	});
});
