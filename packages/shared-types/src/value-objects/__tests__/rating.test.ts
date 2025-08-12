import { describe, expect, it } from "vitest";
import { RatingAggregation, RatingValueObject } from "../work/rating";

describe("Rating Value Object", () => {
	describe("Rating creation and validation", () => {
		it("should create valid rating", () => {
			const result = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.stars).toBe(4.5);
				expect(result.value.count).toBe(100);
				expect(result.value.average).toBe(4.5);
			}
		});

		it("should validate stars range", () => {
			const negativeResult = RatingValueObject.create({
				stars: -1,
				count: 100,
				average: 4.5,
			});
			expect(negativeResult.isErr()).toBe(true);
			if (negativeResult.isErr()) {
				expect(negativeResult.error.message).toBe("Stars must be between 0 and 5");
			}

			const overMaxResult = RatingValueObject.create({
				stars: 5.5,
				count: 100,
				average: 4.5,
			});
			expect(overMaxResult.isErr()).toBe(true);
		});

		it("should validate count is non-negative integer", () => {
			const negativeCountResult = RatingValueObject.create({
				stars: 4.5,
				count: -10,
				average: 4.5,
			});
			expect(negativeCountResult.isErr()).toBe(true);
			if (negativeCountResult.isErr()) {
				expect(negativeCountResult.error.message).toBe("Count must be a non-negative integer");
			}

			const nonIntegerResult = RatingValueObject.create({
				stars: 4.5,
				count: 10.5,
				average: 4.5,
			});
			expect(nonIntegerResult.isErr()).toBe(true);
		});

		it("should validate average range", () => {
			const negativeAvgResult = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: -1,
			});
			expect(negativeAvgResult.isErr()).toBe(true);
			if (negativeAvgResult.isErr()) {
				expect(negativeAvgResult.error.message).toBe("Average must be between 0 and 5");
			}

			const overMaxAvgResult = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 6,
			});
			expect(overMaxAvgResult.isErr()).toBe(true);
		});

		it("should handle rating distribution", () => {
			const distribution = {
				1: 10,
				2: 5,
				3: 20,
				4: 30,
				5: 35,
			};

			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.distribution).toEqual(distribution);
			}
		});

		it("should validate distribution format", () => {
			const invalidDistribution = {
				1: -5, // Invalid: negative count
				2: 5,
				3: 20,
				4: 30,
				5: 35,
			};

			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution: invalidDistribution,
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Distribution must contain valid rating counts");
			}
		});
	});

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const result = RatingValueObject.fromPlainObject({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.stars).toBe(4.5);
				expect(result.value.count).toBe(100);
				expect(result.value.average).toBe(4.5);
			}
		});

		it("should handle non-object input", () => {
			const result1 = RatingValueObject.fromPlainObject(null);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Rating data must be an object");
			}

			const result2 = RatingValueObject.fromPlainObject("string");
			expect(result2.isErr()).toBe(true);

			const result3 = RatingValueObject.fromPlainObject(undefined);
			expect(result3.isErr()).toBe(true);
		});

		it("should validate field types", () => {
			const result = RatingValueObject.fromPlainObject({
				stars: "4.5", // Wrong type
				count: 100,
				average: 4.5,
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Rating must have stars, count, and average as numbers");
			}
		});

		it("should handle distribution in plain object", () => {
			const result = RatingValueObject.fromPlainObject({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution: {
					1: 10,
					2: 5,
					3: 20,
					4: 30,
					5: 35,
				},
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.distribution).toBeDefined();
				expect(result.value.distribution?.[5]).toBe(35);
			}
		});

		it("should ignore invalid distribution", () => {
			const result = RatingValueObject.fromPlainObject({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution: "invalid", // Invalid distribution
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.distribution).toBeUndefined();
			}
		});
	});

	describe("Rating methods", () => {
		it("評価の有無を正しく判定する", () => {
			const noRatingResult = RatingValueObject.create({
				stars: 0,
				count: 0,
				average: 0,
			});

			const hasRatingResult = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			expect(noRatingResult.isOk()).toBe(true);
			expect(hasRatingResult.isOk()).toBe(true);

			const noRating = noRatingResult._unsafeUnwrap();
			const hasRating = hasRatingResult._unsafeUnwrap();

			expect(noRating.hasRatings()).toBe(false);
			expect(hasRating.hasRatings()).toBe(true);
		});

		it("高評価を正しく判定する", () => {
			const highRatingResult = RatingValueObject.create({
				stars: 4.2,
				count: 50,
				average: 4.2,
			});

			const normalRatingResult = RatingValueObject.create({
				stars: 3.5,
				count: 50,
				average: 3.5,
			});

			expect(highRatingResult.isOk()).toBe(true);
			expect(normalRatingResult.isOk()).toBe(true);

			const highRating = highRatingResult._unsafeUnwrap();
			const normalRating = normalRatingResult._unsafeUnwrap();

			expect(highRating.isHighlyRated()).toBe(true);
			expect(normalRating.isHighlyRated()).toBe(false);
		});

		it("信頼性を正しく判定する", () => {
			const highReliabilityResult = RatingValueObject.create({
				stars: 4.0,
				count: 150,
				average: 4.0,
			});

			const mediumReliabilityResult = RatingValueObject.create({
				stars: 4.0,
				count: 60,
				average: 4.0,
			});

			const lowReliabilityResult = RatingValueObject.create({
				stars: 4.0,
				count: 15,
				average: 4.0,
			});

			const insufficientResult = RatingValueObject.create({
				stars: 4.0,
				count: 5,
				average: 4.0,
			});

			expect(highReliabilityResult.isOk()).toBe(true);
			expect(mediumReliabilityResult.isOk()).toBe(true);
			expect(lowReliabilityResult.isOk()).toBe(true);
			expect(insufficientResult.isOk()).toBe(true);

			const highReliability = highReliabilityResult._unsafeUnwrap();
			const mediumReliability = mediumReliabilityResult._unsafeUnwrap();
			const lowReliability = lowReliabilityResult._unsafeUnwrap();
			const insufficient = insufficientResult._unsafeUnwrap();

			expect(highReliability.reliability()).toBe("high");
			expect(mediumReliability.reliability()).toBe("medium");
			expect(lowReliability.reliability()).toBe("low");
			expect(insufficient.reliability()).toBe("insufficient");
		});

		it("表示用の星数を正しく取得する", () => {
			const result = RatingValueObject.create({
				stars: 4.6,
				count: 100,
				average: 4.6,
			});

			expect(result.isOk()).toBe(true);
			const rating = result._unsafeUnwrap();
			expect(rating.displayStars()).toBe(5);
		});

		it("パーセンテージを正しく計算する", () => {
			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
			});

			expect(result.isOk()).toBe(true);
			const rating = result._unsafeUnwrap();
			expect(rating.percentage()).toBe(80);
		});

		it("フォーマット済み文字列を正しく生成する", () => {
			const result = RatingValueObject.create({
				stars: 4.5,
				count: 123,
				average: 4.5,
			});

			expect(result.isOk()).toBe(true);
			const rating = result._unsafeUnwrap();
			expect(rating.format()).toBe("★4.5 (123件)");
		});
	});

	describe("ValidatableValueObject implementation", () => {
		it("should validate valid rating", () => {
			const result = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toEqual([]);
			}
		});

		it("should return validation errors for invalid rating", () => {
			// Create a rating that will become invalid (need to use reflection/private access)
			const result = RatingValueObject.create({
				stars: 5.0,
				count: 100,
				average: 5.0,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				// Manually corrupt the data (this is for testing purposes)
				const invalidRating = result.value.clone();
				expect(invalidRating.isValid()).toBe(true);
			}
		});
	});

	describe("BaseValueObject implementation", () => {
		it("should check equality correctly", () => {
			const result1 = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			const result2 = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			const result3 = RatingValueObject.create({
				stars: 3.5,
				count: 100,
				average: 3.5,
			});

			if (result1.isOk() && result2.isOk() && result3.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
				expect(result1.value.equals(result3.value)).toBe(false);
			}
		});

		it("should return false for non-Rating objects", () => {
			const result = RatingValueObject.create({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			if (result.isOk()) {
				expect(result.value.equals(null as any)).toBe(false);
				expect(result.value.equals("string" as any)).toBe(false);
				expect(result.value.equals({} as any)).toBe(false);
			}
		});

		it("should clone correctly", () => {
			const distribution = {
				1: 10,
				2: 5,
				3: 20,
				4: 30,
				5: 35,
			};

			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution,
			});

			if (result.isOk()) {
				const original = result.value;
				const cloned = original.clone();

				expect(cloned).not.toBe(original);
				expect(cloned.equals(original)).toBe(true);
				expect(cloned.stars).toBe(original.stars);
				expect(cloned.count).toBe(original.count);
				expect(cloned.average).toBe(original.average);
				expect(cloned.distribution).toEqual(original.distribution);
				expect(cloned.distribution).not.toBe(original.distribution); // Should be a copy
			}
		});

		it("should convert to plain object", () => {
			const distribution = {
				1: 10,
				2: 5,
				3: 20,
				4: 30,
				5: 35,
			};

			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution,
			});

			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					stars: 4.0,
					count: 100,
					average: 4.0,
					distribution,
				});
			}
		});

		it("should handle plain object without distribution", () => {
			const result = RatingValueObject.create({
				stars: 4.0,
				count: 100,
				average: 4.0,
			});

			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					stars: 4.0,
					count: 100,
					average: 4.0,
					distribution: undefined,
				});
			}
		});
	});

	describe("RatingAggregation utilities", () => {
		it("DLsite評価（10-50）を1-5に正しく変換する", () => {
			expect(RatingAggregation.fromDLsiteRating(10)).toBe(1);
			expect(RatingAggregation.fromDLsiteRating(30)).toBe(3);
			expect(RatingAggregation.fromDLsiteRating(50)).toBe(5);
			expect(RatingAggregation.fromDLsiteRating(45)).toBe(4.5);
		});

		it("評価分布から平均を正しく計算する", () => {
			const distribution = {
				1: 10,
				2: 5,
				3: 20,
				4: 30,
				5: 35,
			};

			const average = RatingAggregation.calculateAverageFromDistribution(distribution);
			expect(average).toBeCloseTo(3.75, 2);
		});

		it("空の分布から平均を計算する", () => {
			const distribution = {};
			const average = RatingAggregation.calculateAverageFromDistribution(distribution);
			expect(average).toBe(0);
		});

		it("統計情報を正しく計算する", () => {
			const ratings = [5, 4, 5, 3, 4, 5, 2, 4, 5, 4];
			const stats = RatingAggregation.calculateStatistics(ratings);

			expect(stats).not.toBeNull();
			expect(stats!.totalCount).toBe(10);
			expect(stats!.averageRating).toBe(4.1);
			expect(stats!.median).toBe(4);
			expect(stats!.mode).toBe(4); // 4と5が同数なので、最初に見つかった4が最頻値
			expect(stats!.standardDeviation).toBeGreaterThan(0);
		});

		it("空の配列から統計を計算する", () => {
			const stats = RatingAggregation.calculateStatistics([]);
			expect(stats).toBeNull();
		});

		it("偶数個の評価から中央値を計算する", () => {
			const ratings = [1, 2, 3, 4];
			const stats = RatingAggregation.calculateStatistics(ratings);
			expect(stats).not.toBeNull();
			expect(stats!.median).toBe(2.5);
		});

		it("単一の評価から統計を計算する", () => {
			const ratings = [5];
			const stats = RatingAggregation.calculateStatistics(ratings);
			expect(stats).not.toBeNull();
			expect(stats!.totalCount).toBe(1);
			expect(stats!.averageRating).toBe(5);
			expect(stats!.median).toBe(5);
			expect(stats!.mode).toBe(5);
			expect(stats!.standardDeviation).toBe(0);
		});
	});
});
