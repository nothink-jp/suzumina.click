import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { WorkClassificationService } from "../work-classification-service";

describe("WorkClassificationService", () => {
	const createMockWork = (overrides: Partial<WorkDocument> = {}) =>
		({
			id: "RJ123456",
			productId: "RJ123456",
			title: "Test Work",
			circleId: "RG12345",
			circle: "Test Circle",
			workFormat: "音声作品",
			workType: "SOU",
			workTypeString: "音声作品",
			category: "SOU",
			description: "Test description",
			workUrl: "https://example.com",
			thumbnailUrl: "https://example.com/thumb.jpg",
			genres: ["ASMR"],
			customGenres: [],
			ageRating: "All Ages",
			ageCategory: 1,
			price: { current: 1000, currency: "JPY" },
			releaseDate: "2024-01-01",
			releaseDateISO: "2024-01-01T00:00:00Z",
			releaseDateDisplay: "2024年1月1日",
			registDate: "2024-01-01",
			rating: { stars: 45, count: 100 },
			creators: {
				voice_by: [],
				scenario_by: [],
				illust_by: [],
				music_by: [],
				others_by: [],
				created_by: [],
			},
			sampleImages: [],
			salesStatus: { isSale: true, onSale: 0 },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			lastFetchedAt: new Date().toISOString(),
			...overrides,
		}) as WorkDocument;

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
});
