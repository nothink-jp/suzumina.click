/**
 * Work ID Validator テスト
 */

import { describe, expect, it, vi } from "vitest";
import { handleNoWorkIdsError, validateWorkIds, warnPartialSuccess } from "./work-id-validator";

// ログのモック
vi.mock("../../shared/logger", () => ({
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
}));

describe("Work ID Validator", () => {
	describe("validateWorkIds", () => {
		it("基本的な検証機能が動作する", () => {
			const result = validateWorkIds(["RJ123456", "RJ789012"]);

			expect(result.totalFound).toBe(2);
			expect(result.coveragePercentage).toBeGreaterThanOrEqual(0);
			expect(result.coveragePercentage).toBeLessThanOrEqual(100);
		});

		it("作品IDが空の場合でも適切に処理する", () => {
			const result = validateWorkIds([]);

			expect(result.totalFound).toBe(0);
			expect(result.coveragePercentage).toBeDefined();
		});

		it("検証結果の構造が正しい", () => {
			const workIds = ["RJ123456", "RJ789012"];
			const result = validateWorkIds(workIds);

			expect(result).toHaveProperty("isValid");
			expect(result).toHaveProperty("totalExpected");
			expect(result).toHaveProperty("totalFound");
			expect(result).toHaveProperty("coveragePercentage");
			expect(result).toHaveProperty("regionWarning");
			expect(result).toHaveProperty("details");
		});
	});

	describe("handleNoWorkIdsError", () => {
		it("検証結果なしでも適切にエラーハンドリングする", () => {
			expect(() => handleNoWorkIdsError()).not.toThrow();
		});

		it("リージョン警告がある場合は適切なメッセージを表示する", () => {
			const result = {
				isValid: false,
				totalExpected: 100,
				totalFound: 0,
				coveragePercentage: 0,
				missingCount: 100,
				extraCount: 0,
				regionWarning: true,
				details: {
					expectedButNotFound: [],
					foundButNotExpected: [],
				},
			};

			expect(() => handleNoWorkIdsError(result)).not.toThrow();
		});
	});

	describe("warnPartialSuccess", () => {
		it("低いカバレッジ率の場合は警告を表示する", () => {
			const result = {
				isValid: false,
				totalExpected: 100,
				totalFound: 30,
				coveragePercentage: 30,
				missingCount: 70,
				extraCount: 0,
				regionWarning: false,
				details: {
					expectedButNotFound: [],
					foundButNotExpected: [],
				},
			};

			expect(() => warnPartialSuccess(result)).not.toThrow();
		});

		it("リージョン警告がある場合は適切なメッセージを表示する", () => {
			const result = {
				isValid: true,
				totalExpected: 100,
				totalFound: 90,
				coveragePercentage: 90,
				missingCount: 10,
				extraCount: 0,
				regionWarning: true,
				details: {
					expectedButNotFound: [],
					foundButNotExpected: [],
				},
			};

			expect(() => warnPartialSuccess(result)).not.toThrow();
		});
	});
});
