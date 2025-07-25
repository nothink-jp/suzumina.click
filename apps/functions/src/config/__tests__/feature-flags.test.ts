/**
 * Feature Flags Tests for Cloud Functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEntityV2Enabled } from "../feature-flags";

// Mocks
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
}));

import * as logger from "../../shared/logger";

describe("Feature Flags", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// 環境変数をリセット
		process.env = { ...originalEnv };
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("isEntityV2Enabled", () => {
		it("環境変数がtrueの場合はtrueを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "true";

			const result = isEntityV2Enabled();

			expect(result).toBe(true);
			expect(logger.info).toHaveBeenCalledWith("Entity V2 is enabled in Cloud Functions");
		});

		it("環境変数がfalseの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "false";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が設定されていない場合はfalseを返す", () => {
			delete process.env.ENABLE_ENTITY_V2;

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が空文字の場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が大文字のTRUEの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY_V2 = "TRUE";

			const result = isEntityV2Enabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});
	});
});
