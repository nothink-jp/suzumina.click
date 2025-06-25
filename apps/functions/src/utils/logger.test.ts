// functions/src/utils/logger.test.ts
import { describe, expect, it } from "vitest";
import * as logger from "./logger";

describe("logger", () => {
	it("ロガー関数が存在すること", () => {
		expect(logger.info).toBeDefined();
		expect(logger.warn).toBeDefined();
		expect(logger.error).toBeDefined();
		expect(logger.debug).toBeDefined();
	});

	it("ログ関数が呼び出し可能であること", () => {
		expect(() => logger.info("test")).not.toThrow();
		expect(() => logger.warn("test")).not.toThrow();
		expect(() => logger.error("test")).not.toThrow();
		expect(() => logger.debug("test")).not.toThrow();
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
