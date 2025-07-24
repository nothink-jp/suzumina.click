import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { WorkClassificationService } from "../work-classification-service";

describe("WorkClassificationService", () => {
	const createMockWork = (overrides: Partial<OptimizedFirestoreDLsiteWorkData> = {}) =>
		({
			id: "RJ123456",
			productId: "RJ123456",
			title: "Test Work",
			circleId: "RG12345",
			circle: "Test Circle",
			workFormat: "音声作品",
			genres: ["ASMR"],
			ageRating: "All Ages",
			price: { current: 1000, currency: "JPY" },
			releaseDateISO: "2024-01-01T00:00:00Z",
			rating: { stars: 45, count: 100 },
			...overrides,
		}) as OptimizedFirestoreDLsiteWorkData;

	describe("determineMainCategory", () => {
		it("should identify voice category", () => {
			const work = createMockWork({ workFormat: "音声作品" });
			expect(WorkClassificationService.determineMainCategory(work)).toBe("voice");
		});

		it("should identify game category", () => {
			const work = createMockWork({ workFormat: "ゲーム" });
			expect(WorkClassificationService.determineMainCategory(work)).toBe("game");
		});

		it("should identify comic category", () => {
			const work = createMockWork({ workFormat: "漫画" });
			expect(WorkClassificationService.determineMainCategory(work)).toBe("comic");
		});

		it("should return other for unknown format", () => {
			const work = createMockWork({ workFormat: "未知の形式" });
			expect(WorkClassificationService.determineMainCategory(work)).toBe("other");
		});

		it("should handle undefined workFormat", () => {
			const work = createMockWork({ workFormat: undefined });
			expect(WorkClassificationService.determineMainCategory(work)).toBe("other");
		});
	});

	describe("isASMRContent", () => {
		it("should detect ASMR by genre", () => {
			const work = createMockWork({ genres: ["ASMR", "癒し"] });
			expect(WorkClassificationService.isASMRContent(work)).toBe(true);
		});

		it("should detect ASMR by title", () => {
			const work = createMockWork({ title: "【ASMR】耳かきボイス", genres: [] });
			expect(WorkClassificationService.isASMRContent(work)).toBe(true);
		});

		it("should detect ASMR by workFormat", () => {
			const work = createMockWork({ workFormat: "音声作品", genres: [] });
			expect(WorkClassificationService.isASMRContent(work)).toBe(true);
		});

		it("should return false for non-ASMR content", () => {
			const work = createMockWork({
				title: "アクションゲーム",
				genres: ["アクション"],
				workFormat: "ゲーム",
			});
			expect(WorkClassificationService.isASMRContent(work)).toBe(false);
		});
	});

	describe("isAdultContent", () => {
		it("should detect R18 content", () => {
			const work = createMockWork({ ageRating: "R18" });
			expect(WorkClassificationService.isAdultContent(work)).toBe(true);
		});

		it("should detect Adult content", () => {
			const work = createMockWork({ ageRating: "Adult" });
			expect(WorkClassificationService.isAdultContent(work)).toBe(true);
		});

		it("should return false for all-ages content", () => {
			const work = createMockWork({ ageRating: "All Ages" });
			expect(WorkClassificationService.isAdultContent(work)).toBe(false);
		});

		it("should handle empty ageRatings", () => {
			const work = createMockWork({ ageRating: undefined });
			expect(WorkClassificationService.isAdultContent(work)).toBe(false);
		});
	});

	describe("calculatePopularityScore", () => {
		it("should calculate high score for popular work", () => {
			const work = createMockWork({
				rating: { stars: 50, count: 1000 },
				releaseDateISO: new Date().toISOString(),
			});
			const score = WorkClassificationService.calculatePopularityScore(work);
			expect(score).toBeGreaterThan(70); // Max ~80 without wishlist
		});

		it("should calculate low score for unpopular work", () => {
			const work = createMockWork({
				rating: { stars: 20, count: 5 },
				releaseDateISO: "2020-01-01T00:00:00Z",
			});
			const score = WorkClassificationService.calculatePopularityScore(work);
			expect(score).toBeLessThan(25); // Lower without wishlist bonus
		});

		it("should give bonus for new releases", () => {
			const newWork = createMockWork({
				rating: { stars: 40, count: 50 },
				releaseDateISO: new Date().toISOString(),
			});
			const oldWork = createMockWork({
				rating: { stars: 40, count: 50 },
				releaseDateISO: "2020-01-01T00:00:00Z",
			});

			const newScore = WorkClassificationService.calculatePopularityScore(newWork);
			const oldScore = WorkClassificationService.calculatePopularityScore(oldWork);
			expect(newScore).toBeGreaterThan(oldScore);
		});

		it("should handle missing data", () => {
			const work = createMockWork({
				rating: undefined,
			});
			const score = WorkClassificationService.calculatePopularityScore(work);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		});
	});

	describe("normalizeTags", () => {
		it("should normalize known tags", () => {
			const tags = WorkClassificationService.normalizeTags(["耳かき", "ボイス", "えっち"]);
			expect(tags).toContain("ASMR");
			expect(tags).toContain("音声作品");
			expect(tags).toContain("R18");
		});

		it("should keep unknown tags", () => {
			const tags = WorkClassificationService.normalizeTags(["新しいタグ", "未知のジャンル"]);
			expect(tags).toContain("新しいタグ");
			expect(tags).toContain("未知のジャンル");
		});

		it("should remove duplicates", () => {
			const tags = WorkClassificationService.normalizeTags(["耳かき", "ASMR", "耳かき"]);
			expect(tags).toHaveLength(1);
			expect(tags[0]).toBe("ASMR");
		});

		it("should sort tags", () => {
			const tags = WorkClassificationService.normalizeTags(["ボイス", "耳かき", "えっち"]);
			expect(tags).toEqual(["ASMR", "R18", "音声作品"]);
		});
	});

	describe("isSeriesWork", () => {
		it("should detect Japanese series pattern", () => {
			const work = createMockWork({ title: "魔法少女シリーズ第3話" });
			expect(WorkClassificationService.isSeriesWork(work)).toBe(true);
		});

		it("should detect volume pattern", () => {
			const work = createMockWork({ title: "Adventure Series Vol. 5" });
			expect(WorkClassificationService.isSeriesWork(work)).toBe(true);
		});

		it("should detect chapter pattern", () => {
			const work = createMockWork({ title: "Story Chapter 10" });
			expect(WorkClassificationService.isSeriesWork(work)).toBe(true);
		});

		it("should detect episode pattern", () => {
			const work = createMockWork({ title: "Anime Episode 24" });
			expect(WorkClassificationService.isSeriesWork(work)).toBe(true);
		});

		it("should return false for standalone work", () => {
			const work = createMockWork({ title: "単独作品タイトル" });
			expect(WorkClassificationService.isSeriesWork(work)).toBe(false);
		});
	});

	describe("estimateTargetAudience", () => {
		it("should identify female-targeted content", () => {
			const work = createMockWork({ genres: ["乙女向け", "恋愛"] });
			const audience = WorkClassificationService.estimateTargetAudience(work);
			expect(audience.gender).toBe("female");
		});

		it("should identify male-targeted content", () => {
			const work = createMockWork({ genres: ["男性向け", "美少女"] });
			const audience = WorkClassificationService.estimateTargetAudience(work);
			expect(audience.gender).toBe("male");
		});

		it("should identify adult content", () => {
			const work = createMockWork({ ageRating: "R18" });
			const audience = WorkClassificationService.estimateTargetAudience(work);
			expect(audience.ageGroup).toBe("adult");
		});

		it("should default to all for neutral content", () => {
			const work = createMockWork({ genres: ["ファンタジー", "冒険"] });
			const audience = WorkClassificationService.estimateTargetAudience(work);
			expect(audience.gender).toBe("all");
			expect(audience.ageGroup).toBe("all");
		});
	});

	describe("calculateSimilarityScore", () => {
		it("should give high score for same circle works", () => {
			const work1 = createMockWork({ circleId: "RG12345", genres: ["ASMR"] });
			const work2 = createMockWork({ circleId: "RG12345", genres: ["癒し"] });
			const score = WorkClassificationService.calculateSimilarityScore(work1, work2);
			expect(score).toBeGreaterThan(40);
		});

		it("should consider genre overlap", () => {
			const work1 = createMockWork({
				circleId: "RG11111",
				genres: ["ASMR", "癒し", "音声"],
			});
			const work2 = createMockWork({
				circleId: "RG22222",
				genres: ["ASMR", "癒し"],
			});
			const score = WorkClassificationService.calculateSimilarityScore(work1, work2);
			expect(score).toBeGreaterThan(15); // Some genre overlap
		});

		it("should consider category match", () => {
			const work1 = createMockWork({ workFormat: "音声作品" });
			const work2 = createMockWork({ workFormat: "ボイス" });
			const score = WorkClassificationService.calculateSimilarityScore(work1, work2);
			expect(score).toBeGreaterThan(20); // Same category bonus
		});

		it("should consider price similarity", () => {
			const work1 = createMockWork({ prices: { current: 1000, currency: "JPY" } });
			const work2 = createMockWork({ prices: { current: 1100, currency: "JPY" } });
			const score = WorkClassificationService.calculateSimilarityScore(work1, work2);
			expect(score).toBeGreaterThan(0);
		});

		it("should give low score for dissimilar works", () => {
			const work1 = createMockWork({
				circleId: "RG11111",
				genres: ["アクション"],
				workFormat: "ゲーム",
				prices: { current: 5000, currency: "JPY" },
			});
			const work2 = createMockWork({
				circleId: "RG22222",
				genres: ["ASMR", "癒し"],
				workFormat: "音声作品",
				prices: { current: 1000, currency: "JPY" },
			});
			const score = WorkClassificationService.calculateSimilarityScore(work1, work2);
			expect(score).toBeLessThan(20);
		});
	});
});
