import { describe, expect, it } from "vitest";
import { Rating, RatingAggregation } from "../work/rating";

describe("Rating Value Object", () => {
	describe("Rating creation and methods", () => {
		it("評価の有無を正しく判定する", () => {
			const noRating = Rating.parse({
				stars: 0,
				count: 0,
				average: 0,
			});

			const hasRating = Rating.parse({
				stars: 4.5,
				count: 100,
				average: 4.5,
			});

			expect(noRating.hasRatings()).toBe(false);
			expect(hasRating.hasRatings()).toBe(true);
		});

		it("高評価を正しく判定する", () => {
			const highRating = Rating.parse({
				stars: 4.2,
				count: 50,
				average: 4.2,
			});

			const normalRating = Rating.parse({
				stars: 3.5,
				count: 50,
				average: 3.5,
			});

			expect(highRating.isHighlyRated()).toBe(true);
			expect(normalRating.isHighlyRated()).toBe(false);
		});

		it("信頼性を正しく判定する", () => {
			const highReliability = Rating.parse({
				stars: 4.0,
				count: 150,
				average: 4.0,
			});

			const mediumReliability = Rating.parse({
				stars: 4.0,
				count: 60,
				average: 4.0,
			});

			const lowReliability = Rating.parse({
				stars: 4.0,
				count: 15,
				average: 4.0,
			});

			const insufficient = Rating.parse({
				stars: 4.0,
				count: 5,
				average: 4.0,
			});

			expect(highReliability.reliability()).toBe("high");
			expect(mediumReliability.reliability()).toBe("medium");
			expect(lowReliability.reliability()).toBe("low");
			expect(insufficient.reliability()).toBe("insufficient");
		});

		it("表示用の星数を正しく取得する", () => {
			const rating = Rating.parse({
				stars: 4.6,
				count: 100,
				average: 4.6,
			});

			expect(rating.displayStars()).toBe(5);
		});

		it("パーセンテージを正しく計算する", () => {
			const rating = Rating.parse({
				stars: 4.0,
				count: 100,
				average: 4.0,
			});

			expect(rating.percentage()).toBe(80);
		});

		it("フォーマット済み文字列を正しく生成する", () => {
			const rating = Rating.parse({
				stars: 4.5,
				count: 123,
				average: 4.5,
			});

			expect(rating.format()).toBe("★4.5 (123件)");
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
	});
});
