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
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.hasRatings()).toBe(true);
			}
		});

		it("should return false when count = 0", () => {
			const result = WorkRating.create(0, 0, 0);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.hasRatings()).toBe(false);
			}
		});
	});

	describe("isHighlyRated", () => {
		it("should return true for average >= 4.0", () => {
			const result1 = WorkRating.create(4.0, 100, 4.0);
			const result2 = WorkRating.create(4.5, 100, 4.5);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.isHighlyRated()).toBe(true);
			}
			if (result2.isOk()) {
				expect(result2.value.isHighlyRated()).toBe(true);
			}
		});

		it("should return false for average < 4.0", () => {
			const result1 = WorkRating.create(3.9, 100, 3.9);
			const result2 = WorkRating.create(3.0, 100, 3.0);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.isHighlyRated()).toBe(false);
			}
			if (result2.isOk()) {
				expect(result2.value.isHighlyRated()).toBe(false);
			}
		});
	});

	describe("getReliability", () => {
		it("should return 'high' for count >= 100", () => {
			const result1 = WorkRating.create(4.5, 100, 4.5);
			const result2 = WorkRating.create(4.5, 150, 4.5);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.getReliability()).toBe("high");
			}
			if (result2.isOk()) {
				expect(result2.value.getReliability()).toBe("high");
			}
		});

		it("should return 'medium' for count >= 50", () => {
			const result1 = WorkRating.create(4.5, 50, 4.5);
			const result2 = WorkRating.create(4.5, 99, 4.5);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.getReliability()).toBe("medium");
			}
			if (result2.isOk()) {
				expect(result2.value.getReliability()).toBe("medium");
			}
		});

		it("should return 'low' for count >= 10", () => {
			const result1 = WorkRating.create(4.5, 10, 4.5);
			const result2 = WorkRating.create(4.5, 49, 4.5);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.getReliability()).toBe("low");
			}
			if (result2.isOk()) {
				expect(result2.value.getReliability()).toBe("low");
			}
		});

		it("should return 'insufficient' for count < 10", () => {
			const result1 = WorkRating.create(4.5, 9, 4.5);
			const result2 = WorkRating.create(4.5, 0, 4.5);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.getReliability()).toBe("insufficient");
			}
			if (result2.isOk()) {
				expect(result2.value.getReliability()).toBe("insufficient");
			}
		});
	});

	describe("getDisplayStars", () => {
		it("should round stars", () => {
			const result1 = WorkRating.create(4.2, 100, 4.2);
			const result2 = WorkRating.create(4.5, 100, 4.5);
			const result3 = WorkRating.create(4.8, 100, 4.8);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			expect(result3.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.getDisplayStars()).toBe(4);
			}
			if (result2.isOk()) {
				expect(result2.value.getDisplayStars()).toBe(5);
			}
			if (result3.isOk()) {
				expect(result3.value.getDisplayStars()).toBe(5);
			}
		});
	});

	describe("getPercentage", () => {
		it("should convert average to percentage", () => {
			const result1 = WorkRating.create(5.0, 100, 5.0);
			const result2 = WorkRating.create(4.0, 100, 4.0);
			const result3 = WorkRating.create(2.5, 100, 2.5);
			const result4 = WorkRating.create(0, 0, 0);

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			expect(result3.isOk()).toBe(true);
			expect(result4.isOk()).toBe(true);

			if (result1.isOk()) {
				expect(result1.value.getPercentage()).toBe(100);
			}
			if (result2.isOk()) {
				expect(result2.value.getPercentage()).toBe(80);
			}
			if (result3.isOk()) {
				expect(result3.value.getPercentage()).toBe(50);
			}
			if (result4.isOk()) {
				expect(result4.value.getPercentage()).toBe(0);
			}
		});
	});

	describe("format", () => {
		it("should format rating", () => {
			const result1 = WorkRating.create(4.5, 100, 4.5);
			const result2 = WorkRating.create(4.0, 50, 4.0);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk()) {
				expect(result1.value.format()).toBe("★4.5 (100件)");
			}
			if (result2.isOk()) {
				expect(result2.value.format()).toBe("★4.0 (50件)");
			}
		});
	});

	describe("formatWithReviews", () => {
		it("should format with review count if available", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.formatWithReviews()).toBe("★4.5 (100件の評価, 50件のレビュー)");
			}
		});

		it("should fallback to format() without review count", () => {
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.formatWithReviews()).toBe("★4.5 (100件)");
			}
		});

		it("should fallback to format() when review count is 0", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 0);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.formatWithReviews()).toBe("★4.5 (100件)");
			}
		});
	});

	describe("toString", () => {
		it("should use formatWithReviews", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.toString()).toBe(rating.formatWithReviews());
			}
		});
	});

	describe("toJSON", () => {
		it("should include all properties", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.toJSON()).toEqual({
					stars: 4.5,
					count: 100,
					average: 4.5,
					reviewCount: 50,
					distribution: { 5: 60, 4: 30, 3: 10 },
				});
			}
		});

		it("should exclude undefined properties", () => {
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.toJSON()).toEqual({
					stars: 4.5,
					count: 100,
					average: 4.5,
				});
			}
		});
	});

	describe("toPlainObject", () => {
		it("should include computed properties", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
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
			}
		});
	});

	describe("equals", () => {
		it("should return true for equal ratings", () => {
			const result1 = WorkRating.create(4.5, 100, 4.5, 50);
			const result2 = WorkRating.create(4.5, 100, 4.5, 50);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it("should return false for different ratings", () => {
			const result1 = WorkRating.create(4.5, 100, 4.5);
			const result2 = WorkRating.create(4.0, 100, 4.0);
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should check distribution equality", () => {
			const result1 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			const result2 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}

			const result3 = WorkRating.create(4.5, 100, 4.5, 50, { 5: 50, 4: 40, 3: 10 });
			expect(result3.isOk()).toBe(true);
			if (result1.isOk() && result3.isOk()) {
				expect(result1.value.equals(result3.value)).toBe(false);
			}
		});

		it("should return false for non-WorkRating", () => {
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.equals(null as any)).toBe(false);
				expect(rating.equals({} as any)).toBe(false);
			}
		});
	});

	describe("fromDLsiteRating", () => {
		it("should convert DLsite rating (10-50) to 1-5 scale", () => {
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

		it("should handle minimal parameters", () => {
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

		it("should validate API rating range (10-50)", () => {
			const result1 = WorkRating.fromDLsiteRating(9, 100);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("DLsite評価は10-50の範囲である必要があります");
			}

			const result2 = WorkRating.fromDLsiteRating(51, 100);
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toBe("DLsite評価は10-50の範囲である必要があります");
			}
		});
	});

	describe("isValid", () => {
		it("should validate instance state", () => {
			const result = WorkRating.create(4.5, 100, 4.5);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const rating = result.value;
				expect(rating.isValid()).toBe(true);
				expect(rating.getValidationErrors()).toEqual([]);
			}
		});
	});

	describe("clone", () => {
		it("should create a copy", () => {
			const result = WorkRating.create(4.5, 100, 4.5, 50, { 5: 60, 4: 30, 3: 10 });
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const original = result.value;
				const cloned = original.clone();
				expect(cloned).not.toBe(original);
				expect(cloned.equals(original)).toBe(true);
				expect(cloned.stars).toBe(original.stars);
				expect(cloned.count).toBe(original.count);
				expect(cloned.average).toBe(original.average);
				expect(cloned.reviewCount).toBe(original.reviewCount);
				expect(cloned.distribution).toEqual(original.distribution);
			}
		});
	});
});
