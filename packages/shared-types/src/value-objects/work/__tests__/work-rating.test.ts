import { describe, expect, it } from "vitest";
import { WorkRating } from "../work-rating";

describe("WorkRating", () => {
	describe("constructor", () => {
		it("should create a valid work rating", () => {
			const rating = new WorkRating(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(rating.stars).toBe(4.5);
			expect(rating.count).toBe(100);
			expect(rating.average).toBe(4.5);
			expect(rating.reviewCount).toBe(50);
			expect(rating.distribution).toEqual({ 5: 60, 4: 30, 3: 10 });
		});

		it("should throw error for invalid stars", () => {
			expect(() => new WorkRating(-1, 100, 4.5)).toThrow("Stars must be between 0 and 5");
			expect(() => new WorkRating(6, 100, 4.5)).toThrow("Stars must be between 0 and 5");
		});

		it("should throw error for negative count", () => {
			expect(() => new WorkRating(4.5, -1, 4.5)).toThrow("Count cannot be negative");
		});

		it("should throw error for invalid average", () => {
			expect(() => new WorkRating(4.5, 100, -1)).toThrow("Average must be between 0 and 5");
			expect(() => new WorkRating(4.5, 100, 6)).toThrow("Average must be between 0 and 5");
		});

		it("should throw error for negative review count", () => {
			expect(() => new WorkRating(4.5, 100, 4.5, -1)).toThrow("Review count cannot be negative");
		});

		it("should allow optional parameters", () => {
			const rating = new WorkRating(4.5, 100, 4.5);
			expect(rating.reviewCount).toBeUndefined();
			expect(rating.distribution).toBeUndefined();
		});
	});

	describe("hasRatings", () => {
		it("should return true when count > 0", () => {
			expect(new WorkRating(4.5, 100, 4.5).hasRatings()).toBe(true);
		});

		it("should return false when count = 0", () => {
			expect(new WorkRating(0, 0, 0).hasRatings()).toBe(false);
		});
	});

	describe("isHighlyRated", () => {
		it("should return true for average >= 4.0", () => {
			expect(new WorkRating(4.0, 100, 4.0).isHighlyRated()).toBe(true);
			expect(new WorkRating(4.5, 100, 4.5).isHighlyRated()).toBe(true);
		});

		it("should return false for average < 4.0", () => {
			expect(new WorkRating(3.9, 100, 3.9).isHighlyRated()).toBe(false);
			expect(new WorkRating(3.0, 100, 3.0).isHighlyRated()).toBe(false);
		});
	});

	describe("getReliability", () => {
		it("should return 'high' for count >= 100", () => {
			expect(new WorkRating(4.5, 100, 4.5).getReliability()).toBe("high");
			expect(new WorkRating(4.5, 150, 4.5).getReliability()).toBe("high");
		});

		it("should return 'medium' for count >= 50", () => {
			expect(new WorkRating(4.5, 50, 4.5).getReliability()).toBe("medium");
			expect(new WorkRating(4.5, 99, 4.5).getReliability()).toBe("medium");
		});

		it("should return 'low' for count >= 10", () => {
			expect(new WorkRating(4.5, 10, 4.5).getReliability()).toBe("low");
			expect(new WorkRating(4.5, 49, 4.5).getReliability()).toBe("low");
		});

		it("should return 'insufficient' for count < 10", () => {
			expect(new WorkRating(4.5, 9, 4.5).getReliability()).toBe("insufficient");
			expect(new WorkRating(4.5, 0, 4.5).getReliability()).toBe("insufficient");
		});
	});

	describe("getDisplayStars", () => {
		it("should round stars", () => {
			expect(new WorkRating(4.2, 100, 4.2).getDisplayStars()).toBe(4);
			expect(new WorkRating(4.5, 100, 4.5).getDisplayStars()).toBe(5);
			expect(new WorkRating(4.8, 100, 4.8).getDisplayStars()).toBe(5);
		});
	});

	describe("getPercentage", () => {
		it("should convert average to percentage", () => {
			expect(new WorkRating(5.0, 100, 5.0).getPercentage()).toBe(100);
			expect(new WorkRating(4.0, 100, 4.0).getPercentage()).toBe(80);
			expect(new WorkRating(2.5, 100, 2.5).getPercentage()).toBe(50);
			expect(new WorkRating(0, 0, 0).getPercentage()).toBe(0);
		});
	});

	describe("format", () => {
		it("should format rating", () => {
			expect(new WorkRating(4.5, 100, 4.5).format()).toBe("★4.5 (100件)");
			expect(new WorkRating(4.0, 50, 4.0).format()).toBe("★4.0 (50件)");
		});
	});

	describe("formatWithReviews", () => {
		it("should format with review count if available", () => {
			expect(new WorkRating(4.5, 100, 4.5, 50).formatWithReviews()).toBe(
				"★4.5 (100件の評価, 50件のレビュー)",
			);
		});

		it("should fallback to format() without review count", () => {
			expect(new WorkRating(4.5, 100, 4.5).formatWithReviews()).toBe("★4.5 (100件)");
		});

		it("should fallback to format() when review count is 0", () => {
			expect(new WorkRating(4.5, 100, 4.5, 0).formatWithReviews()).toBe("★4.5 (100件)");
		});
	});

	describe("toString", () => {
		it("should use formatWithReviews", () => {
			const rating = new WorkRating(4.5, 100, 4.5, 50);
			expect(rating.toString()).toBe(rating.formatWithReviews());
		});
	});

	describe("toJSON", () => {
		it("should include all properties", () => {
			const rating = new WorkRating(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(rating.toJSON()).toEqual({
				stars: 4.5,
				count: 100,
				average: 4.5,
				reviewCount: 50,
				distribution: { 5: 60, 4: 30, 3: 10 },
			});
		});

		it("should exclude undefined properties", () => {
			const rating = new WorkRating(4.5, 100, 4.5);
			expect(rating.toJSON()).toEqual({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});
		});
	});

	describe("toPlainObject", () => {
		it("should include computed properties", () => {
			const rating = new WorkRating(4.5, 100, 4.5, 50);
			const plain = rating.toPlainObject();

			expect(plain).toMatchObject({
				stars: 4.5,
				count: 100,
				average: 4.5,
				reviewCount: 50,
				hasRatings: true,
				isHighlyRated: true,
				reliability: "high",
				formattedRating: "★4.5 (100件)",
			});
		});
	});

	describe("equals", () => {
		it("should return true for equal ratings", () => {
			const rating1 = new WorkRating(4.5, 100, 4.5, 50);
			const rating2 = new WorkRating(4.5, 100, 4.5, 50);
			expect(rating1.equals(rating2)).toBe(true);
		});

		it("should return false for different properties", () => {
			const rating1 = new WorkRating(4.5, 100, 4.5);
			const rating2 = new WorkRating(4.0, 100, 4.0);
			expect(rating1.equals(rating2)).toBe(false);
		});

		it("should handle distribution comparison", () => {
			const rating1 = new WorkRating(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			const rating2 = new WorkRating(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(rating1.equals(rating2)).toBe(true);

			const rating3 = new WorkRating(4.5, 100, 4.5, 50, { 5: 50, 4: 40, 3: 10 });
			expect(rating1.equals(rating3)).toBe(false);
		});

		it("should return false for non-WorkRating", () => {
			const rating = new WorkRating(4.5, 100, 4.5);
			expect(rating.equals({} as any)).toBe(false);
		});
	});

	describe("fromDLsiteRating", () => {
		it("should convert from DLsite scale", () => {
			const rating = WorkRating.fromDLsiteRating(45, 100, 50, { "5": 60, "4": 30, "3": 10 });
			expect(rating.stars).toBe(4.5);
			expect(rating.average).toBe(4.5);
			expect(rating.count).toBe(100);
			expect(rating.reviewCount).toBe(50);
			expect(rating.distribution).toEqual({ 5: 60, 4: 30, 3: 10 });
		});

		it("should handle without optional parameters", () => {
			const rating = WorkRating.fromDLsiteRating(30, 50);
			expect(rating.stars).toBe(3.0);
			expect(rating.average).toBe(3.0);
			expect(rating.count).toBe(50);
			expect(rating.reviewCount).toBeUndefined();
			expect(rating.distribution).toBeUndefined();
		});
	});

	describe("fromLegacyRatingInfo", () => {
		it("should convert from legacy format", () => {
			const rating = WorkRating.fromLegacyRatingInfo({
				stars: 4.5,
				count: 100,
				reviewCount: 50,
				averageDecimal: 4.52,
				ratingDetail: [
					{ review_point: 5, count: 60, ratio: 0.6 },
					{ review_point: 4, count: 30, ratio: 0.3 },
					{ review_point: 3, count: 10, ratio: 0.1 },
				],
			});

			expect(rating).toBeDefined();
			expect(rating!.stars).toBe(4.5);
			expect(rating!.average).toBe(4.52);
			expect(rating!.count).toBe(100);
			expect(rating!.reviewCount).toBe(50);
			expect(rating!.distribution).toEqual({ 5: 60, 4: 30, 3: 10 });
		});

		it("should use stars as average when averageDecimal is missing", () => {
			const rating = WorkRating.fromLegacyRatingInfo({
				stars: 4.5,
				count: 100,
			});

			expect(rating!.average).toBe(4.5);
		});

		it("should return undefined for undefined input", () => {
			expect(WorkRating.fromLegacyRatingInfo(undefined)).toBeUndefined();
		});
	});

	describe("empty", () => {
		it("should create empty rating", () => {
			const rating = WorkRating.empty();
			expect(rating.stars).toBe(0);
			expect(rating.count).toBe(0);
			expect(rating.average).toBe(0);
			expect(rating.hasRatings()).toBe(false);
		});
	});
});
