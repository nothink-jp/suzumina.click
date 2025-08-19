import { describe, expect, it } from "vitest";
import {
	AgeRatingSchema,
	checkAgeRating,
	filterR18Content,
	getAgeRatingDisplayName,
	isAllAgesContent,
	isR18Content,
	mapNumericAgeCategory,
} from "../age-rating";

describe("age-rating utilities", () => {
	describe("AgeRatingSchema", () => {
		it("should validate valid age ratings", () => {
			expect(() => AgeRatingSchema.parse("全年齢")).not.toThrow();
			expect(() => AgeRatingSchema.parse("R15")).not.toThrow();
			expect(() => AgeRatingSchema.parse("R18")).not.toThrow();
			expect(() => AgeRatingSchema.parse("成人向け")).not.toThrow();
			expect(() => AgeRatingSchema.parse("未設定")).not.toThrow();
		});

		it("should reject invalid age ratings", () => {
			expect(() => AgeRatingSchema.parse("invalid")).toThrow();
			expect(() => AgeRatingSchema.parse("")).toThrow();
		});
	});

	describe("mapNumericAgeCategory", () => {
		it("should map 1 to 全年齢", () => {
			expect(mapNumericAgeCategory(1)).toBe("全年齢");
		});

		it("should map 2 to R15", () => {
			expect(mapNumericAgeCategory(2)).toBe("R15");
		});

		it("should map 3 to R18", () => {
			expect(mapNumericAgeCategory(3)).toBe("R18");
		});

		it("should map unknown values to 未設定", () => {
			expect(mapNumericAgeCategory(0)).toBe("未設定");
			expect(mapNumericAgeCategory(4)).toBe("未設定");
			expect(mapNumericAgeCategory(999)).toBe("未設定");
		});
	});

	describe("isR18Content", () => {
		it("should return true for R18 keywords", () => {
			expect(isR18Content("R18")).toBe(true);
			expect(isR18Content("R-18")).toBe(true);
			expect(isR18Content("18禁")).toBe(true);
			expect(isR18Content("成人向け")).toBe(true);
			expect(isR18Content("Adult")).toBe(true);
			expect(isR18Content("18歳以上")).toBe(true);
			expect(isR18Content("18才以上")).toBe(true);
		});

		it("should return true for numeric category '3'", () => {
			expect(isR18Content("3")).toBe(true);
		});

		it("should return false for non-R18 content", () => {
			expect(isR18Content("全年齢")).toBe(false);
			expect(isR18Content("R15")).toBe(false);
			expect(isR18Content("1")).toBe(false);
			expect(isR18Content("2")).toBe(false);
		});

		it("should return false for empty/null values", () => {
			expect(isR18Content()).toBe(false);
			expect(isR18Content("")).toBe(false);
			expect(isR18Content("   ")).toBe(false);
		});

		it("should handle partial matches", () => {
			expect(isR18Content("この作品はR18です")).toBe(true);
			expect(isR18Content("成人向け作品")).toBe(true);
		});
	});

	describe("isAllAgesContent", () => {
		it("should return true for all ages keywords", () => {
			expect(isAllAgesContent("全年齢")).toBe(true);
			expect(isAllAgesContent("全年令")).toBe(true);
			expect(isAllAgesContent("一般")).toBe(true);
			expect(isAllAgesContent("General")).toBe(true);
			expect(isAllAgesContent("All ages")).toBe(true);
		});

		it("should return true for numeric category '1'", () => {
			expect(isAllAgesContent("1")).toBe(true);
		});

		it("should return false for non-all-ages content", () => {
			expect(isAllAgesContent("R18")).toBe(false);
			expect(isAllAgesContent("R15")).toBe(false);
			expect(isAllAgesContent("2")).toBe(false);
			expect(isAllAgesContent("3")).toBe(false);
		});

		it("should return false for empty/null values", () => {
			expect(isAllAgesContent()).toBe(false);
			expect(isAllAgesContent("")).toBe(false);
		});

		it("should handle partial matches", () => {
			expect(isAllAgesContent("全年齢対象")).toBe(true);
			expect(isAllAgesContent("一般向け")).toBe(true);
		});
	});

	describe("checkAgeRating", () => {
		it("should handle numeric category '3' as R18", () => {
			const result = checkAgeRating("3");
			expect(result.isR18).toBe(true);
			expect(result.isAllAges).toBe(false);
			expect(result.originalRating).toBe("3");
			expect(result.normalizedRating).toBe("R18");
		});

		it("should handle numeric category '1' as all ages", () => {
			const result = checkAgeRating("1");
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(true);
			expect(result.originalRating).toBe("1");
			expect(result.normalizedRating).toBe("全年齢");
		});

		it("should handle numeric category '2' as R15", () => {
			const result = checkAgeRating("2");
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(false);
			expect(result.originalRating).toBe("2");
			expect(result.normalizedRating).toBe("R15");
		});

		it("should normalize R18 content", () => {
			const result = checkAgeRating("成人向け");
			expect(result.isR18).toBe(true);
			expect(result.isAllAges).toBe(false);
			expect(result.normalizedRating).toBe("R18");
		});

		it("should normalize all ages content", () => {
			const result = checkAgeRating("全年齢");
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(true);
			expect(result.normalizedRating).toBe("全年齢");
		});

		it("should normalize R15 content", () => {
			const result = checkAgeRating("R15");
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(false);
			expect(result.normalizedRating).toBe("R15");
		});

		it("should handle unknown ratings", () => {
			const result = checkAgeRating("unknown");
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(false);
			expect(result.originalRating).toBe("unknown");
			expect(result.normalizedRating).toBe("未設定");
		});

		it("should handle empty/null values", () => {
			const result = checkAgeRating();
			expect(result.isR18).toBe(false);
			expect(result.isAllAges).toBe(false);
			expect(result.originalRating).toBe("");
			expect(result.normalizedRating).toBe(null);
		});
	});

	describe("filterR18Content", () => {
		interface TestItem {
			id: string;
			title: string;
			ageRating?: string;
		}

		const testItems: TestItem[] = [
			{ id: "1", title: "Item 1", ageRating: "全年齢" },
			{ id: "2", title: "Item 2", ageRating: "R18" },
			{ id: "3", title: "Item 3", ageRating: "R15" },
			{ id: "4", title: "Item 4", ageRating: "成人向け" },
			{ id: "5", title: "Item 5", ageRating: "3" },
			{ id: "6", title: "Item 6" }, // No age rating
		];

		it("should filter out R18 content", () => {
			const filtered = filterR18Content(testItems, (item) => item.ageRating);
			expect(filtered).toHaveLength(3);
			expect(filtered.map((item) => item.id)).toEqual(["1", "3", "6"]);
		});

		it("should handle empty array", () => {
			const filtered = filterR18Content([], (item: TestItem) => item.ageRating);
			expect(filtered).toEqual([]);
		});

		it("should handle all R18 items", () => {
			const allR18: TestItem[] = [
				{ id: "1", title: "Item 1", ageRating: "R18" },
				{ id: "2", title: "Item 2", ageRating: "成人向け" },
			];
			const filtered = filterR18Content(allR18, (item) => item.ageRating);
			expect(filtered).toEqual([]);
		});

		it("should handle all non-R18 items", () => {
			const allSafe: TestItem[] = [
				{ id: "1", title: "Item 1", ageRating: "全年齢" },
				{ id: "2", title: "Item 2", ageRating: "R15" },
			];
			const filtered = filterR18Content(allSafe, (item) => item.ageRating);
			expect(filtered).toEqual(allSafe);
		});
	});

	describe("getAgeRatingDisplayName", () => {
		it("should return normalized rating when available", () => {
			expect(getAgeRatingDisplayName("3")).toBe("R18");
			expect(getAgeRatingDisplayName("1")).toBe("全年齢");
			expect(getAgeRatingDisplayName("2")).toBe("R15");
			expect(getAgeRatingDisplayName("R18")).toBe("R18");
			expect(getAgeRatingDisplayName("全年齢")).toBe("全年齢");
		});

		it("should return 未設定 for unknown ratings", () => {
			expect(getAgeRatingDisplayName("カスタムレーティング")).toBe("未設定");
		});

		it("should return 未設定 for empty/null values", () => {
			expect(getAgeRatingDisplayName()).toBe("未設定");
			expect(getAgeRatingDisplayName("")).toBe("未設定");
		});

		it("should handle known rating variations", () => {
			expect(getAgeRatingDisplayName("成人向け")).toBe("R18");
			expect(getAgeRatingDisplayName("R-18")).toBe("R18");
			expect(getAgeRatingDisplayName("R-15")).toBe("R15");
		});
	});
});
