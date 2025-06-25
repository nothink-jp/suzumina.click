// functions/src/utils/logger.test.ts
import { describe, expect, it, vi } from "vitest";

// 簡単なモックでCloud Loggingをスタブ化
vi.mock("@google-cloud/logging", () => ({
	Logging: vi.fn(() => ({
		log: vi.fn(() => ({
			entry: vi.fn(() => ({})),
			write: vi.fn().mockResolvedValue(undefined),
		})),
	})),
}));

import * as logger from "./logger";

describe("logger", () => {
	it("ロガー関数が存在すること", () => {
		expect(logger.info).toBeDefined();
		expect(logger.warn).toBeDefined();
		expect(logger.error).toBeDefined();
		expect(logger.debug).toBeDefined();
		expect(logger.asyncLogger).toBeDefined();
	});

	it("ログ関数が呼び出し可能であること", () => {
		expect(() => logger.info("test")).not.toThrow();
		expect(() => logger.warn("test")).not.toThrow();
		expect(() => logger.error("test")).not.toThrow();
		expect(() => logger.debug("test")).not.toThrow();
	});

	it("非同期ロガーが呼び出し可能であること", async () => {
		await expect(logger.asyncLogger.info("test")).resolves.toBeUndefined();
		await expect(logger.asyncLogger.warn("test")).resolves.toBeUndefined();
		await expect(logger.asyncLogger.error("test")).resolves.toBeUndefined();
		await expect(logger.asyncLogger.debug("test")).resolves.toBeUndefined();
	});

	it("エラーオブジェクトを渡してもエラーにならないこと", () => {
		const testError = new Error("test error");
		expect(() => logger.error("test message", testError)).not.toThrow();
	});

	it("メタデータオプションを渡してもエラーにならないこと", () => {
		const metadata = { userId: "test123", action: "test" };
		expect(() => logger.info("test message", metadata)).not.toThrow();
	});
});
