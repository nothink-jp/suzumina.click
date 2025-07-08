/**
 * Work ID Validator テスト
 */

import { describe, expect, it, vi } from "vitest";
import {
	createUnionWorkIds,
	handleNoWorkIdsError,
	validateWorkIds,
	warnPartialSuccess,
} from "./work-id-validator";

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

	describe("createUnionWorkIds", () => {
		// ファイルシステムのモック
		vi.mock("node:fs", () => ({
			readFileSync: vi.fn().mockReturnValue(
				JSON.stringify({
					workIds: ["RJ123456", "RJ789012", "RJ111111", "RJ222222"],
				}),
			),
		}));

		it("和集合が正しく作成される", () => {
			const currentRegionIds = ["RJ123456", "RJ333333"];
			const result = createUnionWorkIds(currentRegionIds);

			expect(result.currentRegionIds).toEqual(currentRegionIds);
			expect(result.unionIds).toContain("RJ123456");
			expect(result.unionIds).toContain("RJ333333");
			expect(result.unionIds.length).toBeGreaterThan(currentRegionIds.length);
		});

		it("重複が正しく計算される", () => {
			const currentRegionIds = ["RJ123456", "RJ789012"];
			const result = createUnionWorkIds(currentRegionIds);

			expect(result.overlapCount).toBe(2); // 全て重複
			expect(result.regionOnlyCount).toBe(0);
			expect(result.assetOnlyCount).toBeGreaterThan(0);
		});

		it("リージョン差異が正しく検出される", () => {
			// リージョンで取得できるIDが少ない場合
			const currentRegionIds = ["RJ123456"];
			const result = createUnionWorkIds(currentRegionIds);

			expect(result.regionDifferenceDetected).toBe(true);
		});

		it("結果の構造が正しい", () => {
			const currentRegionIds = ["RJ123456"];
			const result = createUnionWorkIds(currentRegionIds);

			expect(result).toHaveProperty("currentRegionIds");
			expect(result).toHaveProperty("assetFileIds");
			expect(result).toHaveProperty("unionIds");
			expect(result).toHaveProperty("regionOnlyCount");
			expect(result).toHaveProperty("assetOnlyCount");
			expect(result).toHaveProperty("overlapCount");
			expect(result).toHaveProperty("regionDifferenceDetected");
		});
	});
});
