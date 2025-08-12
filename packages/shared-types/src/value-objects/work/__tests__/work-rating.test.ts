import { describe, expect, it } from "vitest";
import { WorkRating } from "../work-rating";

describe("WorkRating", () => {
	describe("create", () => {
		it("should create a valid work rating", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.stars).toBe(4.5);
				expect(rating.count).toBe(100);
				expect(rating.average).toBe(4.5);
				expect(rating.reviewCount).toBe(50);
				expect(rating.distribution).toEqual({ 5: 60, 4: 30, 3: 10 });
			}
		});

		it("should return error for invalid stars", () => {
			const result1 = WorkRating.create(-1, 100, 4.5);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Stars must be between 0 and 5");
			}

			const result2 = WorkRating.create(6, 100, 4.5);
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toBe("Stars must be between 0 and 5");
			}
		});

		it("should return error for negative count", () => {
			const result = WorkRating.create(4.5, -1, 4.5);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Count cannot be negative");
			}
		});

		it("should return error for invalid average", () => {
			const result1 = WorkRating.create(4.5, 100, -1);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Average must be between 0 and 5");
			}

			const result2 = WorkRating.create(4.5, 100, 6);
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toBe("Average must be between 0 and 5");
			}
		});

		it("should return error for negative review count", () => {
			const result = WorkRating.create(4.5, 100, 4.5, -1);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Review count cannot be negative");
			}
		});

		it("should allow optional parameters", () => {
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.reviewCount).toBeUndefined();
				expect(rating.distribution).toBeUndefined();
			}
		});
	});

	describe("hasRatings", () => {
		it("should return true when count > 0", () => {
			const rating = WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap();
			expect(rating.hasRatings()).toBe(true);
		});

		it("should return false when count = 0", () => {
			const rating = WorkRating.create(0, 0, 0)._unsafeUnwrap();
			expect(rating.hasRatings()).toBe(false);
		});
	});

	describe("isHighlyRated", () => {
		it("should return true for average >= 4.0", () => {
			expect(WorkRating.create(4.0, 100, 4.0)._unsafeUnwrap().isHighlyRated()).toBe(true);
			expect(WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap().isHighlyRated()).toBe(true);
		});

		it("should return false for average < 4.0", () => {
			expect(WorkRating.create(3.9, 100, 3.9)._unsafeUnwrap().isHighlyRated()).toBe(false);
			expect(WorkRating.create(3.0, 100, 3.0)._unsafeUnwrap().isHighlyRated()).toBe(false);
		});
	});

	describe("getReliability", () => {
		it("should return 'high' for count >= 100", () => {
			expect(WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap().getReliability()).toBe("high");
			expect(WorkRating.create(4.5, 150, 4.5)._unsafeUnwrap().getReliability()).toBe("high");
		});

		it("should return 'medium' for count >= 50", () => {
			expect(WorkRating.create(4.5, 50, 4.5)._unsafeUnwrap().getReliability()).toBe("medium");
			expect(WorkRating.create(4.5, 99, 4.5)._unsafeUnwrap().getReliability()).toBe("medium");
		});

		it("should return 'low' for count >= 10", () => {
			expect(WorkRating.create(4.5, 10, 4.5)._unsafeUnwrap().getReliability()).toBe("low");
			expect(WorkRating.create(4.5, 49, 4.5)._unsafeUnwrap().getReliability()).toBe("low");
		});

		it("should return 'insufficient' for count < 10", () => {
			expect(WorkRating.create(4.5, 9, 4.5)._unsafeUnwrap().getReliability()).toBe("insufficient");
			expect(WorkRating.create(4.5, 0, 4.5)._unsafeUnwrap().getReliability()).toBe("insufficient");
		});
	});

	describe("getDisplayStars", () => {
		it("should round stars", () => {
			expect(WorkRating.create(4.2, 100, 4.2)._unsafeUnwrap().getDisplayStars()).toBe(4);
			expect(WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap().getDisplayStars()).toBe(5);
			expect(WorkRating.create(4.8, 100, 4.8)._unsafeUnwrap().getDisplayStars()).toBe(5);
		});
	});

	describe("getPercentage", () => {
		it("should convert average to percentage", () => {
			expect(WorkRating.create(5.0, 100, 5.0)._unsafeUnwrap().getPercentage()).toBe(100);
			expect(WorkRating.create(4.0, 100, 4.0)._unsafeUnwrap().getPercentage()).toBe(80);
			expect(WorkRating.create(2.5, 100, 2.5)._unsafeUnwrap().getPercentage()).toBe(50);
			expect(WorkRating.create(0, 0, 0)._unsafeUnwrap().getPercentage()).toBe(0);
		});
	});

	describe("format", () => {
		it("should format rating", () => {
			expect(WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap().format()).toBe("★4.5 (100件)");
			expect(WorkRating.create(4.0, 50, 4.0)._unsafeUnwrap().format()).toBe("★4.0 (50件)");
		});
	});

	describe("formatWithReviews", () => {
		it("should format with review count if available", () => {
			expect(WorkRating.create(4.5, 100, 4.5, 50)._unsafeUnwrap().formatWithReviews()).toBe(
				"★4.5 (100件の評価, 50件のレビュー)",
			);
		});

		it("should fallback to format() without review count", () => {
			expect(WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap().formatWithReviews()).toBe(
				"★4.5 (100件)",
			);
		});

		it("should fallback to format() when review count is 0", () => {
			expect(WorkRating.create(4.5, 100, 4.5, 0)._unsafeUnwrap().formatWithReviews()).toBe(
				"★4.5 (100件)",
			);
		});
	});

	describe("toString", () => {
		it("should use formatWithReviews", () => {
			const rating = WorkRating.create(4.5, 100, 4.5, 50)._unsafeUnwrap();
			expect(rating.toString()).toBe(rating.formatWithReviews());
		});
	});

	describe("toJSON", () => {
		it("should include all properties", () => {
			const rating = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 })._unsafeUnwrap();
			expect(rating.toJSON()).toEqual({
				stars: 4.5,
				count: 100,
				average: 4.5,
				reviewCount: 50,
				distribution: { 5: 60, 4: 30, 3: 10 },
			});
		});

		it("should exclude undefined properties", () => {
			const rating = WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap();
			expect(rating.toJSON()).toEqual({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});
		});
	});

	describe("toPlainObject", () => {
		it("should include computed properties", () => {
			const rating = WorkRating.create(4.5, 100, 4.5, 50)._unsafeUnwrap();
			const plain = rating.toPlainObject();

			expect(plain).toMatchObject({
				stars: 4.5,
				count: 100,
				average: 4.5,
				reviewCount: 50,
			});
		});
	});

	describe("equals", () => {
		it("should return true for equal ratings", () => {
			const rating1 = WorkRating.create(4.5, 100, 4.5, 50)._unsafeUnwrap();
			const rating2 = WorkRating.create(4.5, 100, 4.5, 50)._unsafeUnwrap();
			expect(rating1.equals(rating2)).toBe(true);
		});

		it("should return false for different properties", () => {
			const rating1 = WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap();
			const rating2 = WorkRating.create(4.0, 100, 4.0)._unsafeUnwrap();
			expect(rating1.equals(rating2)).toBe(false);
		});

		it("should handle distribution comparison", () => {
			const rating1 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 })._unsafeUnwrap();
			const rating2 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 })._unsafeUnwrap();
			expect(rating1.equals(rating2)).toBe(true);

			const rating3 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 50, 4: 40, 3: 10 })._unsafeUnwrap();
			expect(rating1.equals(rating3)).toBe(false);
		});

		it("should return false for non-WorkRating", () => {
			const rating = WorkRating.create(4.5, 100, 4.5)._unsafeUnwrap();
			expect(rating.equals({} as any)).toBe(false);
		});
	});

	describe("fromDLsiteRating", () => {
		it("should convert from DLsite scale", () => {
			const result = WorkRating.fromDLsiteRating(45, 100, 50, { "5": 60, "4": 30, "3": 10 });
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.stars).toBe(4.5);
				expect(rating.average).toBe(4.5);
				expect(rating.count).toBe(100);
				expect(rating.reviewCount).toBe(50);
				expect(rating.distribution).toEqual({ 5: 60, 4: 30, 3: 10 });
			}
		});

		it("should handle without optional parameters", () => {
			const result = WorkRating.fromDLsiteRating(30, 50);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.stars).toBe(3.0);
				expect(rating.average).toBe(3.0);
				expect(rating.count).toBe(50);
				expect(rating.reviewCount).toBeUndefined();
				expect(rating.distribution).toBeUndefined();
			}
		});
	});

	describe("empty", () => {
		it("should create empty rating", () => {
			const result = WorkRating.empty();
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.stars).toBe(0);
				expect(rating.count).toBe(0);
				expect(rating.average).toBe(0);
				expect(rating.hasRatings()).toBe(false);
			}
		});
	});
});
