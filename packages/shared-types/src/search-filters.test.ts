import { describe, expect, it } from "vitest";
import {
	getActiveFilterDescriptions,
	getDateRangeFromPreset,
	hasActiveFilters,
	type UnifiedSearchFilters,
	UnifiedSearchFiltersSchema,
} from "./search-filters";

describe("search-filters", () => {
	describe("UnifiedSearchFiltersSchema", () => {
		it("should validate valid filter object", () => {
			const validFilters = {
				query: "test",
				type: "all" as const,
				limit: 12,
				sortBy: "relevance" as const,
				tagMode: "any" as const,
				layerSearchMode: "any_layer" as const,
			};

			const result = UnifiedSearchFiltersSchema.parse(validFilters);
			expect(result).toEqual(validFilters);
		});

		it("should apply default values", () => {
			const minimalFilters = {};

			const result = UnifiedSearchFiltersSchema.parse(minimalFilters);
			expect(result.type).toBe("all");
			expect(result.limit).toBe(12);
			expect(result.sortBy).toBe("relevance");
			expect(result.tagMode).toBe("any");
		});

		it("should validate date range presets", () => {
			const filtersWithDate = {
				dateRange: "today" as const,
			};

			const result = UnifiedSearchFiltersSchema.parse(filtersWithDate);
			expect(result.dateRange).toBe("today");
		});

		it("should validate numeric range filters", () => {
			const filtersWithNumbers = {
				playCountMin: 10,
				playCountMax: 100,
				likeCountMin: 5,
				durationMin: 30,
				durationMax: 120,
			};

			const result = UnifiedSearchFiltersSchema.parse(filtersWithNumbers);
			expect(result.playCountMin).toBe(10);
			expect(result.playCountMax).toBe(100);
			expect(result.likeCountMin).toBe(5);
			expect(result.durationMin).toBe(30);
			expect(result.durationMax).toBe(120);
		});
	});

	describe("getDateRangeFromPreset", () => {
		it("should return correct range for 'today'", () => {
			const result = getDateRangeFromPreset("today");
			const today = new Date();
			const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

			expect(result.from.getTime()).toBe(todayStart.getTime());
			expect(result.to.getTime()).toBe(todayStart.getTime() + 24 * 60 * 60 * 1000);
		});

		it("should return correct range for 'this_week'", () => {
			const result = getDateRangeFromPreset("this_week");
			const today = new Date();
			const dayOfWeek = today.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const expectedStart = new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
			expectedStart.setHours(0, 0, 0, 0);

			expect(result.from.getDate()).toBe(expectedStart.getDate());
		});

		it("should return correct range for 'this_month'", () => {
			const result = getDateRangeFromPreset("this_month");
			const now = new Date();
			const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

			expect(result.from.getTime()).toBe(expectedStart.getTime());
			expect(result.to.getTime()).toBe(expectedEnd.getTime());
		});

		it("should return correct range for 'last_30_days'", () => {
			const result = getDateRangeFromPreset("last_30_days");
			const now = new Date();
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

			expect(result.from.getTime()).toBeLessThanOrEqual(thirtyDaysAgo.getTime() + 1000); // 1秒の誤差を許容
			expect(result.to.getTime()).toBeLessThanOrEqual(now.getTime() + 1000);
		});
	});

	describe("hasActiveFilters", () => {
		it("should return false for default filters", () => {
			const defaultFilters: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
			};

			expect(hasActiveFilters(defaultFilters)).toBe(false);
		});

		it("should return true when date range is set", () => {
			const filtersWithDate: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				dateRange: "today",
			};

			expect(hasActiveFilters(filtersWithDate)).toBe(true);
		});

		it("should return true when numeric filters are set", () => {
			const filtersWithNumbers: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				playCountMin: 10,
			};

			expect(hasActiveFilters(filtersWithNumbers)).toBe(true);
		});

		it("should return true when tags are set", () => {
			const filtersWithTags: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				tags: ["test"],
			};

			expect(hasActiveFilters(filtersWithTags)).toBe(true);
		});

		it("should return true when sort is not relevance", () => {
			const filtersWithSort: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "newest",
				tagMode: "any",
				layerSearchMode: "any_layer",
			};

			expect(hasActiveFilters(filtersWithSort)).toBe(true);
		});
	});

	describe("getActiveFilterDescriptions", () => {
		it("should return empty array for default filters", () => {
			const defaultFilters: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
			};

			const descriptions = getActiveFilterDescriptions(defaultFilters);
			expect(descriptions).toEqual([]);
		});

		it("should describe date range filters", () => {
			const filtersWithDate: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				dateRange: "today",
			};

			const descriptions = getActiveFilterDescriptions(filtersWithDate);
			expect(descriptions).toContain("期間: 今日");
		});

		it("should describe numeric range filters", () => {
			const filtersWithNumbers: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				playCountMin: 10,
				playCountMax: 100,
			};

			const descriptions = getActiveFilterDescriptions(filtersWithNumbers);
			expect(descriptions).toContain("再生数: 10〜100回");
		});

		it("should describe minimum only filters", () => {
			const filtersWithMin: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				likeCountMin: 5,
			};

			const descriptions = getActiveFilterDescriptions(filtersWithMin);
			expect(descriptions).toContain("いいね: 5以上");
		});

		it("should describe maximum only filters", () => {
			const filtersWithMax: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "any",
				layerSearchMode: "any_layer",
				favoriteCountMax: 50,
			};

			const descriptions = getActiveFilterDescriptions(filtersWithMax);
			expect(descriptions).toContain("お気に入り: 50以下");
		});

		it("should describe tag filters", () => {
			const filtersWithTags: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "relevance",
				tagMode: "all",
				layerSearchMode: "any_layer",
				tags: ["挨拶", "応援"],
			};

			const descriptions = getActiveFilterDescriptions(filtersWithTags);
			expect(descriptions).toContain("タグ(すべて含む): 挨拶, 応援");
		});

		it("should describe sort order", () => {
			const filtersWithSort: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "newest",
				tagMode: "any",
				layerSearchMode: "any_layer",
			};

			const descriptions = getActiveFilterDescriptions(filtersWithSort);
			expect(descriptions).toContain("並び順: 新しい順");
		});

		it("should describe multiple filters", () => {
			const complexFilters: UnifiedSearchFilters = {
				type: "all",
				limit: 12,
				sortBy: "popular",
				tagMode: "any",
				layerSearchMode: "any_layer",
				dateRange: "this_week",
				playCountMin: 10,
				tags: ["テスト"],
			};

			const descriptions = getActiveFilterDescriptions(complexFilters);
			expect(descriptions.length).toBeGreaterThan(1);
			expect(descriptions).toContain("期間: 今週");
			expect(descriptions).toContain("再生数: 10回以上");
			expect(descriptions).toContain("タグ(いずれか含む): テスト");
			expect(descriptions).toContain("並び順: 人気順");
		});
	});
});
