import type { Rating } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { ReviewAnalysisService } from "../review-analysis-service";

describe("ReviewAnalysisService", () => {
	describe("calculateReliabilityScore", () => {
		it("should calculate high score for balanced distribution with many reviews", () => {
			const distribution = [20, 30, 40, 50, 60]; // Total: 200 reviews
			const score = ReviewAnalysisService.calculateReliabilityScore(distribution);
			expect(score).toBeGreaterThan(70);
		});

		it("should calculate low score for heavily skewed distribution", () => {
			const distribution = [0, 0, 0, 0, 100]; // All 5-star reviews
			const score = ReviewAnalysisService.calculateReliabilityScore(distribution);
			expect(score).toBeLessThan(50);
		});

		it("should handle empty distribution", () => {
			const distribution = [0, 0, 0, 0, 0];
			const score = ReviewAnalysisService.calculateReliabilityScore(distribution);
			expect(score).toBe(0);
		});

		it("should consider volume in scoring", () => {
			const lowVolume = [1, 1, 2, 1, 1]; // Total: 6 reviews
			const highVolume = [10, 10, 20, 10, 10]; // Total: 60 reviews

			const lowScore = ReviewAnalysisService.calculateReliabilityScore(lowVolume);
			const highScore = ReviewAnalysisService.calculateReliabilityScore(highVolume);

			expect(highScore).toBeGreaterThan(lowScore);
		});
	});

	describe("detectReviewBias", () => {
		it("should detect positive bias", () => {
			const distribution = [0, 0, 5, 10, 85]; // 85% 5-star reviews
			const result = ReviewAnalysisService.detectReviewBias(distribution);
			expect(result.hasBias).toBe(true);
			expect(result.biasType).toBe("positive");
			expect(result.biasStrength).toBe(85);
		});

		it("should detect negative bias", () => {
			const distribution = [60, 20, 10, 5, 5]; // 60% 1-star reviews
			const result = ReviewAnalysisService.detectReviewBias(distribution);
			expect(result.hasBias).toBe(true);
			expect(result.biasType).toBe("negative");
			expect(result.biasStrength).toBe(60);
		});

		it("should detect extreme bias", () => {
			const distribution = [45, 5, 5, 5, 40]; // 85% extreme reviews
			const result = ReviewAnalysisService.detectReviewBias(distribution);
			expect(result.hasBias).toBe(true);
			expect(result.biasType).toBe("extreme");
			expect(result.biasStrength).toBe(85);
		});

		it("should not detect bias for balanced distribution", () => {
			const distribution = [15, 20, 30, 20, 15];
			const result = ReviewAnalysisService.detectReviewBias(distribution);
			expect(result.hasBias).toBe(false);
		});

		it("should not detect bias for too few reviews", () => {
			const distribution = [1, 1, 1, 1, 1]; // Only 5 reviews
			const result = ReviewAnalysisService.detectReviewBias(distribution);
			expect(result.hasBias).toBe(false);
		});
	});

	describe("calculateWeightedRating", () => {
		it("should weight recent reviews more heavily", () => {
			const now = new Date();
			const reviews = [
				{ rating: 5, date: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }, // 1 year old
				{ rating: 3, date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
				{ rating: 3, date: now }, // Today
			];

			const weighted = ReviewAnalysisService.calculateWeightedRating(reviews);
			expect(weighted).toBeLessThan(4); // Should be closer to 3 than 5
		});

		it("should weight verified purchases more heavily", () => {
			const now = new Date();
			const reviews = [
				{ rating: 3, date: now, isVerifiedPurchase: false },
				{ rating: 5, date: now, isVerifiedPurchase: true },
			];

			const weighted = ReviewAnalysisService.calculateWeightedRating(reviews);
			expect(weighted).toBeGreaterThan(4); // Should be closer to 5
		});

		it("should handle empty reviews", () => {
			const weighted = ReviewAnalysisService.calculateWeightedRating([]);
			expect(weighted).toBe(0);
		});
	});

	describe("analyzeReviewTrend", () => {
		it("should detect improving trend", () => {
			const now = new Date();
			const reviews = [
				{ rating: 3, date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
				{ rating: 3, date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
				{ rating: 5, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
				{ rating: 5, date: now },
			];

			const trend = ReviewAnalysisService.analyzeReviewTrend(reviews);
			expect(trend.trend).toBe("improving");
			expect(trend.recentAverage).toBeGreaterThan(trend.overallAverage);
		});

		it("should detect declining trend", () => {
			const now = new Date();
			const reviews = [
				{ rating: 5, date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
				{ rating: 5, date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
				{ rating: 2, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
				{ rating: 2, date: now },
			];

			const trend = ReviewAnalysisService.analyzeReviewTrend(reviews);
			expect(trend.trend).toBe("declining");
			expect(trend.recentAverage).toBeLessThan(trend.overallAverage);
		});

		it("should detect stable trend", () => {
			const now = new Date();
			const reviews = [
				{ rating: 4, date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
				{ rating: 4, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
				{ rating: 4, date: now },
			];

			const trend = ReviewAnalysisService.analyzeReviewTrend(reviews);
			expect(trend.trend).toBe("stable");
			expect(Math.abs(trend.recentAverage - trend.overallAverage)).toBeLessThan(0.5);
		});

		it("should handle empty reviews", () => {
			const trend = ReviewAnalysisService.analyzeReviewTrend([]);
			expect(trend.trend).toBe("stable");
			expect(trend.recentAverage).toBe(0);
			expect(trend.overallAverage).toBe(0);
		});
	});

	describe("normalizeReviewDistribution", () => {
		it("should normalize array format", () => {
			const raw = [10, 20, 30, 40, 50];
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(raw, 150);
			expect(normalized).toEqual([10, 20, 30, 40, 50]);
		});

		it("should normalize object format", () => {
			const raw = { "1": 10, "2": 20, "3": 30, "4": 40, "5": 50 };
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(raw, 150);
			expect(normalized).toEqual([10, 20, 30, 40, 50]);
		});

		it("should handle API response format", () => {
			const raw = [
				{ review_point: 1, count: 10 },
				{ review_point: 2, count: 20 },
				{ review_point: 3, count: 30 },
				{ review_point: 4, count: 40 },
				{ review_point: 5, count: 50 },
			];
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(raw, 150);
			expect(normalized).toEqual([10, 20, 30, 40, 50]);
		});

		it("should handle missing data", () => {
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(null, 100);
			expect(normalized).toEqual([0, 0, 0, 0, 0]);
		});

		it("should handle partial data", () => {
			const raw = { "1": 10, "3": 30, "5": 50 };
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(raw, 90);
			expect(normalized).toEqual([10, 0, 30, 0, 50]);
		});

		it("should adjust for mismatched total", () => {
			const raw = [10, 20, 30, 40, 50]; // Sum: 150
			const normalized = ReviewAnalysisService.normalizeReviewDistribution(raw, 300);
			// Should double all values
			expect(normalized[0]).toBe(20);
			expect(normalized[4]).toBe(100);
		});
	});

	describe("estimateSentimentScore", () => {
		it("should calculate high score for positive rating", () => {
			const rating: Rating = {
				stars: 5,
				count: 100,
				average: 5,
				distribution: { 1: 0, 2: 0, 3: 0, 4: 10, 5: 90 },
			};
			const score = ReviewAnalysisService.estimateSentimentScore(rating);
			expect(score).toBeGreaterThan(80);
		});

		it("should calculate low score for negative rating", () => {
			const rating: Rating = {
				stars: 2,
				count: 100,
				average: 2,
				distribution: { 1: 60, 2: 30, 3: 10, 4: 0, 5: 0 },
			};
			const score = ReviewAnalysisService.estimateSentimentScore(rating);
			expect(score).toBeLessThan(30);
		});

		it("should calculate medium score for mixed rating", () => {
			const rating: Rating = {
				stars: 3,
				count: 100,
				average: 3,
				distribution: { 1: 20, 2: 20, 3: 20, 4: 20, 5: 20 },
			};
			const score = ReviewAnalysisService.estimateSentimentScore(rating);
			expect(score).toBeGreaterThan(40);
			expect(score).toBeLessThan(70);
		});

		it("should handle rating without distribution", () => {
			const rating: Rating = {
				stars: 4,
				count: 50,
				average: 4,
			};
			const score = ReviewAnalysisService.estimateSentimentScore(rating);
			expect(score).toBe(80); // 4 * 20
		});

		it("should cap score at 0-100", () => {
			const highRating: Rating = {
				stars: 5,
				count: 1000,
				average: 5,
				distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1000 },
			};
			const lowRating: Rating = {
				stars: 1,
				count: 1000,
				average: 1,
				distribution: { 1: 1000, 2: 0, 3: 0, 4: 0, 5: 0 },
			};

			expect(ReviewAnalysisService.estimateSentimentScore(highRating)).toBe(100);
			expect(ReviewAnalysisService.estimateSentimentScore(lowRating)).toBe(0);
		});
	});
});
