/**
 * Feature Flags Tests for Cloud Functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEntityV2Enabled } from "../feature-flags";

describe("Feature Flags", () => {
	const originalEnv = process.env;
	let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// 環境変数をリセット
		process.env = { ...originalEnv };
		consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
	});

	afterEach(() => {
		process.env = originalEnv;
		consoleInfoSpy.mockRestore();
	});

	describe("isEntityV2Enabled", () => {
		it("環境変数がtrueの場合はtrueを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "true";

			const result = isEntityV2Enabled();

			expect(result).toBe(true);
			expect(consoleInfoSpy).toHaveBeenCalledWith("Entity V2 is enabled in Cloud Functions");
		});

		it("環境変数がfalseの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "false";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(consoleInfoSpy).not.toHaveBeenCalled();
		});

		it("環境変数が設定されていない場合はfalseを返す", () => {
			delete process.env.ENABLE_ENTITY_V2;

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(consoleInfoSpy).not.toHaveBeenCalled();
		});

		it("環境変数が空文字の場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(consoleInfoSpy).not.toHaveBeenCalled();
		});

		it("環境変数が大文字のTRUEの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "TRUE";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(consoleInfoSpy).not.toHaveBeenCalled();
		});
	});
});
