/**
 * Work Actions テスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkActions } from "../../actions/work-actions";
import type { WorkData } from "../../models/work-data";

/**
 * テスト用モックデータ作成
 */
const createMockWork = (overrides?: Partial<WorkData>): WorkData => {
	return {
		id: "RJ123456",
		productId: "RJ123456",
		title: "Test Work",
		circle: {
			id: "RG12345",
			name: "Test Circle",
		},
		price: {
			current: 1000,
			currency: "JPY",
		},
		releaseDate: new Date().toISOString(),
		...overrides,
	};
};

describe("WorkActions", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
	});

	describe("isNewRelease", () => {
		it("should return true for works released within 30 days", () => {
			const work = createMockWork({
				releaseDate: "2024-01-10T00:00:00Z", // 5 days ago
			});
			expect(WorkActions.isNewRelease(work)).toBe(true);
		});

		it("should return false for works released over 30 days ago", () => {
			const work = createMockWork({
				releaseDate: "2023-12-01T00:00:00Z", // 45 days ago
			});
			expect(WorkActions.isNewRelease(work)).toBe(false);
		});

		it("should return false if releaseDate is missing", () => {
			const work = createMockWork({
				releaseDate: "",
			});
			expect(WorkActions.isNewRelease(work)).toBe(false);
		});
	});

	describe("isOnSale", () => {
		it("should return true when discountRate exists", () => {
			const work = createMockWork({
				price: {
					current: 800,
					original: 1000,
					discountRate: 20,
				},
			});
			expect(WorkActions.isOnSale(work)).toBe(true);
		});

		it("should return false when discountRate is 0", () => {
			const work = createMockWork({
				price: {
					current: 1000,
					discountRate: 0,
				},
			});
			expect(WorkActions.isOnSale(work)).toBe(false);
		});

		it("should return false when discountRate is undefined", () => {
			const work = createMockWork();
			expect(WorkActions.isOnSale(work)).toBe(false);
		});
	});

	describe("updatePrice", () => {
		it("should update price and calculate discount rate", () => {
			const work = createMockWork();
			const updated = WorkActions.updatePrice(work, 800, 1000);

			expect(updated.price.current).toBe(800);
			expect(updated.price.original).toBe(1000);
			expect(updated.price.discountRate).toBe(20);
			expect(updated.lastModified).toBeDefined();
		});

		it("should handle price without original", () => {
			const work = createMockWork();
			const updated = WorkActions.updatePrice(work, 500);

			expect(updated.price.current).toBe(500);
			expect(updated.price.original).toBeUndefined();
			expect(updated.price.discountRate).toBeUndefined();
		});

		it("should not set discount if new price is higher than original", () => {
			const work = createMockWork();
			const updated = WorkActions.updatePrice(work, 1200, 1000);

			expect(updated.price.current).toBe(1200);
			expect(updated.price.original).toBe(1000);
			expect(updated.price.discountRate).toBeUndefined();
		});

		it("should preserve currency", () => {
			const work = createMockWork({
				price: { current: 1000, currency: "USD" },
			});
			const updated = WorkActions.updatePrice(work, 900);

			expect(updated.price.currency).toBe("USD");
		});
	});

	describe("addTag", () => {
		it("should add new tag to work", () => {
			const work = createMockWork({ tags: ["tag1"] });
			const updated = WorkActions.addTag(work, "tag2");

			expect(updated.tags).toEqual(["tag1", "tag2"]);
			expect(updated.lastModified).toBeDefined();
		});

		it("should not add duplicate tag", () => {
			const work = createMockWork({ tags: ["tag1"] });
			const updated = WorkActions.addTag(work, "tag1");

			expect(updated.tags).toEqual(["tag1"]);
			expect(updated).toBe(work); // Same reference
		});

		it("should handle work without tags", () => {
			const work = createMockWork();
			const updated = WorkActions.addTag(work, "newTag");

			expect(updated.tags).toEqual(["newTag"]);
		});
	});

	describe("formatPrice", () => {
		it("should format price in Japanese locale", () => {
			const work = createMockWork({
				price: { current: 1000, currency: "JPY" },
			});
			const formatted = WorkActions.formatPrice(work, "ja");

			expect(formatted).toContain("1,000");
			expect(formatted).toMatch(/¥|￥/);
		});

		it("should format price in English locale", () => {
			const work = createMockWork({
				price: { current: 1000, currency: "JPY" },
			});
			const formatted = WorkActions.formatPrice(work, "en");

			expect(formatted).toContain("1,000");
		});

		it("should use JPY as default currency", () => {
			const work = createMockWork({
				price: { current: 1000 },
			});
			const formatted = WorkActions.formatPrice(work);

			expect(formatted).toBeDefined();
		});
	});

	describe("generateWorkUrl", () => {
		it("should generate maniax URL for adult works", () => {
			const work = createMockWork({
				productId: "RJ123456",
				isAdult: true,
			});
			const url = WorkActions.generateWorkUrl(work);

			expect(url).toBe("https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html");
		});

		it("should generate home URL for all-ages works", () => {
			const work = createMockWork({
				productId: "RJ123456",
				isAdult: false,
			});
			const url = WorkActions.generateWorkUrl(work);

			expect(url).toBe("https://www.dlsite.com/home/work/=/product_id/RJ123456.html");
		});
	});

	describe("generateThumbnailUrl", () => {
		it("should return existing thumbnailUrl if available", () => {
			const work = createMockWork({
				thumbnailUrl: "https://example.com/thumb.jpg",
			});
			const url = WorkActions.generateThumbnailUrl(work);

			expect(url).toBe("https://example.com/thumb.jpg");
		});

		it("should generate default thumbnail URL", () => {
			const work = createMockWork({
				productId: "RJ123456",
			});
			const url = WorkActions.generateThumbnailUrl(work);

			expect(url).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ123000/RJ123456_img_main.jpg",
			);
		});

		it("should generate thum size URL", () => {
			const work = createMockWork({
				productId: "RJ123456",
			});
			const url = WorkActions.generateThumbnailUrl(work, "thum");

			expect(url).toContain("_img_thum.jpg");
		});
	});

	describe("calculatePopularityScore", () => {
		it("should calculate score based on multiple factors", () => {
			const work = createMockWork({
				rating: { average: 4.5, count: 50, reviewCount: 30 },
				saleCount: 500,
				releaseDate: new Date().toISOString(), // New release
			});
			const score = WorkActions.calculatePopularityScore(work);

			expect(score).toBeGreaterThan(0);
			expect(score).toBeLessThanOrEqual(100);
		});

		it("should handle missing rating data", () => {
			const work = createMockWork({
				saleCount: 100,
			});
			const score = WorkActions.calculatePopularityScore(work);

			expect(score).toBeGreaterThan(0);
		});
	});

	describe("getRatingReliability", () => {
		it("should return high for 100+ reviews", () => {
			const work = createMockWork({
				rating: { average: 4, count: 150, reviewCount: 150 },
			});
			expect(WorkActions.getRatingReliability(work)).toBe("high");
		});

		it("should return medium for 20-99 reviews", () => {
			const work = createMockWork({
				rating: { average: 4, count: 50, reviewCount: 50 },
			});
			expect(WorkActions.getRatingReliability(work)).toBe("medium");
		});

		it("should return low for 1-19 reviews", () => {
			const work = createMockWork({
				rating: { average: 4, count: 10, reviewCount: 10 },
			});
			expect(WorkActions.getRatingReliability(work)).toBe("low");
		});

		it("should return none for 0 reviews", () => {
			const work = createMockWork();
			expect(WorkActions.getRatingReliability(work)).toBe("none");
		});
	});

	describe("computeProperties", () => {
		it("should compute all properties", () => {
			const work = createMockWork({
				releaseDate: new Date().toISOString(),
				price: {
					current: 800,
					original: 1000,
					discountRate: 20,
				},
			});
			const computed = WorkActions.computeProperties(work);

			expect(computed._computed).toEqual({
				isNewRelease: true,
				isOnSale: true,
				displayTitle: "Test Work",
				formattedPrice: expect.any(String),
			});
		});
	});
});

vi.restoreAllMocks();
