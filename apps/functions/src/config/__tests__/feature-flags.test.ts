/**
 * Feature Flags Tests for Cloud Functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEntityEnabled } from "../feature-flags";

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

	describe("isEntityEnabled", () => {
		it("環境変数がtrueの場合はtrueを返す", () => {
			process.env.ENABLE_ENTITY = "true";

			const result = isEntityEnabled();

			expect(result).toBe(true);
			expect(logger.info).toHaveBeenCalledWith("Entity is enabled in Cloud Functions");
		});

		it("環境変数がfalseの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY = "false";

			const result = isEntityEnabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が設定されていない場合はfalseを返す", () => {
			delete process.env.ENABLE_ENTITY;

			const result = isEntityEnabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が空文字の場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY = "";

			const result = isEntityEnabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it("環境変数が大文字のTRUEの場合はfalseを返す", () => {
			process.env.ENABLE_ENTITY = "TRUE";

			const result = isEntityEnabled();

			expect(result).toBe(false);
			expect(logger.info).not.toHaveBeenCalled();
		});
	});
});
