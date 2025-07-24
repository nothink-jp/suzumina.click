import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { DataAggregationService } from "../data-aggregation-service";

describe("DataAggregationService", () => {
	const createMockWork = (overrides: Partial<OptimizedFirestoreDLsiteWorkData> = {}) =>
		({
			id: "RJ123456",
			productId: "RJ123456",
			title: "Test Work",
			circleId: "RG12345",
			circle: "Test Circle",
			workFormat: "音声作品",
			genres: ["ASMR", "癒し"],
			ageRating: "R18",
			price: { current: 1000, currency: "JPY" },
			releaseDateISO: "2024-01-01T00:00:00Z",
			releaseDateDisplay: "2024年1月1日",
			releaseDate: "2024-01-01",
			rating: { stars: 45, count: 100 },
			favoriteCount: 500,
			...overrides,
		}) as OptimizedFirestoreDLsiteWorkData;

	describe("aggregateWorkStatistics", () => {
		it("should calculate basic statistics", () => {
			const works = [
				createMockWork({ price: { current: 500, currency: "JPY" } }),
				createMockWork({ price: { current: 1500, currency: "JPY" } }),
				createMockWork({ price: { current: 3500, currency: "JPY" } }),
				createMockWork({ price: { current: 6000, currency: "JPY" } }),
			];

			const stats = DataAggregationService.aggregateWorkStatistics(works);

			expect(stats.totalWorks).toBe(4);
			expect(stats.averagePrice).toBe(2875); // (500+1500+3500+6000)/4
			expect(stats.medianPrice).toBe(2500); // (1500+3500)/2
		});

		it("should categorize price ranges correctly", () => {
			const works = [
				createMockWork({ price: { current: 500, currency: "JPY" } }),
				createMockWork({ price: { current: 2000, currency: "JPY" } }),
				createMockWork({ price: { current: 4000, currency: "JPY" } }),
				createMockWork({ price: { current: 6000, currency: "JPY" } }),
			];

			const stats = DataAggregationService.aggregateWorkStatistics(works);

			expect(stats.priceRanges.under1000).toBe(1);
			expect(stats.priceRanges.under3000).toBe(1);
			expect(stats.priceRanges.under5000).toBe(1);
			expect(stats.priceRanges.over5000).toBe(1);
		});

		it("should count categories", () => {
			const works = [
				createMockWork({ workFormat: "音声作品" }),
				createMockWork({ workFormat: "ボイス" }),
				createMockWork({ workFormat: "ゲーム" }),
				createMockWork({ workFormat: "漫画" }),
			];

			const stats = DataAggregationService.aggregateWorkStatistics(works);

			expect(stats.categoryCounts.voice).toBe(2);
			expect(stats.categoryCounts.game).toBe(1);
			expect(stats.categoryCounts.comic).toBe(1);
		});

		it("should aggregate genre distribution", () => {
			const works = [
				createMockWork({ genres: ["ASMR", "癒し"] }),
				createMockWork({ genres: ["ASMR", "音声"] }),
				createMockWork({ genres: ["癒し", "音声"] }),
			];

			const stats = DataAggregationService.aggregateWorkStatistics(works);

			expect(stats.genreDistribution["ASMR"]).toBe(2);
			expect(stats.genreDistribution["癒し"]).toBe(2);
			expect(stats.genreDistribution["音声"]).toBe(2);
		});

		it("should identify top circles", () => {
			const works = [
				createMockWork({ circleId: "RG001", circle: "Circle A" }),
				createMockWork({ circleId: "RG001", circle: "Circle A" }),
				createMockWork({ circleId: "RG001", circle: "Circle A" }),
				createMockWork({ circleId: "RG002", circle: "Circle B" }),
				createMockWork({ circleId: "RG002", circle: "Circle B" }),
				createMockWork({ circleId: "RG003", circle: "Circle C" }),
			];

			const stats = DataAggregationService.aggregateWorkStatistics(works);

			expect(stats.topCircles[0].circleId).toBe("RG001");
			expect(stats.topCircles[0].workCount).toBe(3);
			expect(stats.topCircles[1].circleId).toBe("RG002");
			expect(stats.topCircles[1].workCount).toBe(2);
		});

		it("should handle empty works array", () => {
			const stats = DataAggregationService.aggregateWorkStatistics([]);

			expect(stats.totalWorks).toBe(0);
			expect(stats.averagePrice).toBe(0);
			expect(stats.medianPrice).toBe(0);
			expect(stats.topCircles).toHaveLength(0);
		});
	});

	describe("aggregateMonthlySalesTrend", () => {
		it("should aggregate monthly trends", () => {
			const now = new Date();
			const works = [
				createMockWork({
					releaseDateISO: now.toISOString(),
					price: { current: 1000, currency: "JPY" },
					rating: { stars: 45, count: 100 },
				}),
				createMockWork({
					releaseDateISO: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
					price: { current: 2000, currency: "JPY" },
					rating: { stars: 45, count: 50 },
				}),
			];

			const trends = DataAggregationService.aggregateMonthlySalesTrend(works, 3);

			expect(trends).toHaveLength(3);
			expect(trends[2].releaseCount).toBe(1); // Current month
			expect(trends[1].releaseCount).toBe(1); // Last month
			expect(trends[0].releaseCount).toBe(0); // Two months ago
		});

		it("should calculate revenue potential", () => {
			const now = new Date();
			const work = createMockWork({
				releaseDateISO: now.toISOString(),
				price: { current: 1000, currency: "JPY" },
				rating: { stars: 45, count: 100 },
			});

			const trends = DataAggregationService.aggregateMonthlySalesTrend([work], 1);

			expect(trends[0].totalRevenuePotential).toBe(100000); // 1000 * 100
		});

		it("should handle works without reviews", () => {
			const now = new Date();
			const work = createMockWork({
				releaseDateISO: now.toISOString(),
				price: { current: 1000, currency: "JPY" },
				rating: undefined,
			});

			const trends = DataAggregationService.aggregateMonthlySalesTrend([work], 1);

			expect(trends[0].totalRevenuePotential).toBe(1000); // Uses 1 as default
		});
	});

	describe("analyzeGenreTrends", () => {
		it("should analyze genre growth", () => {
			const now = new Date();
			const oldDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days ago
			const recentDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

			const works = [
				// Old ASMR works
				createMockWork({
					genres: ["ASMR"],
					releaseDateISO: oldDate.toISOString(),
				}),
				createMockWork({
					genres: ["ASMR"],
					releaseDateISO: oldDate.toISOString(),
				}),
				// Recent ASMR works
				createMockWork({
					genres: ["ASMR"],
					releaseDateISO: recentDate.toISOString(),
				}),
				createMockWork({
					genres: ["ASMR"],
					releaseDateISO: recentDate.toISOString(),
				}),
				createMockWork({
					genres: ["ASMR"],
					releaseDateISO: recentDate.toISOString(),
				}),
			];

			const trends = DataAggregationService.analyzeGenreTrends(works, 90);
			const asmrTrend = trends.find((t) => t.genre === "ASMR");

			expect(asmrTrend).toBeDefined();
			expect(asmrTrend!.totalWorks).toBe(5);
			expect(asmrTrend!.recentWorks).toBe(3);
			expect(asmrTrend!.growthRate).toBe(50); // (3-2)/2 * 100
		});

		it("should calculate average ratings and prices", () => {
			const works = [
				createMockWork({
					genres: ["癒し"],
					rating: { stars: 40, count: 100 },
					price: { current: 1000, currency: "JPY" },
				}),
				createMockWork({
					genres: ["癒し"],
					rating: { stars: 50, count: 100 },
					price: { current: 2000, currency: "JPY" },
				}),
			];

			const trends = DataAggregationService.analyzeGenreTrends(works);
			const healingTrend = trends.find((t) => t.genre === "癒し");

			expect(healingTrend!.averageRating).toBe(45); // 45 stars on 0-50 scale
			expect(healingTrend!.averagePrice).toBe(1500);
		});

		it("should limit to top 20 genres", () => {
			const works = [];
			for (let i = 0; i < 30; i++) {
				works.push(createMockWork({ genres: [`Genre${i}`] }));
			}

			const trends = DataAggregationService.analyzeGenreTrends(works);
			expect(trends).toHaveLength(20);
		});
	});

	describe("analyzeCirclePerformance", () => {
		it("should analyze circle metrics", () => {
			const works = [
				createMockWork({
					circleId: "RG001",
					circle: "Popular Circle",
					rating: { stars: 45, count: 100 },
					price: { current: 1000, currency: "JPY" },
				}),
				createMockWork({
					circleId: "RG001",
					circle: "Popular Circle",
					rating: { stars: 40, count: 100 },
					price: { current: 1500, currency: "JPY" },
				}),
				createMockWork({
					circleId: "RG001",
					circle: "Popular Circle",
					rating: { stars: 50, count: 100 },
					price: { current: 2000, currency: "JPY" },
				}),
			];

			const performance = DataAggregationService.analyzeCirclePerformance(works);
			const circle = performance[0];

			expect(circle.circleId).toBe("RG001");
			expect(circle.metrics.totalWorks).toBe(3);
			expect(circle.metrics.averageRating).toBe(45); // 45 stars on 0-50 scale
			expect(circle.metrics.averagePrice).toBe(1500);
			expect(circle.metrics.priceRange.min).toBe(1000);
			expect(circle.metrics.priceRange.max).toBe(2000);
		});

		it("should calculate release frequency", () => {
			const now = new Date();
			const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

			const works = [
				createMockWork({
					circleId: "RG001",
					circle: "Circle A",
					releaseDateISO: threeMonthsAgo.toISOString(),
				}),
				createMockWork({
					circleId: "RG001",
					circle: "Circle A",
					releaseDateISO: now.toISOString(),
				}),
				createMockWork({
					circleId: "RG001",
					circle: "Circle A",
					releaseDateISO: now.toISOString(),
				}),
			];

			const performance = DataAggregationService.analyzeCirclePerformance(works);
			const circle = performance[0];

			// 3 works in ~3 months = ~1 work per month
			expect(circle.metrics.releaseFrequency).toBeGreaterThan(0.5);
			expect(circle.metrics.releaseFrequency).toBeLessThan(1.5);
		});

		it("should filter circles with less than 3 works", () => {
			const works = [
				createMockWork({ circleId: "RG001" }),
				createMockWork({ circleId: "RG001" }),
				createMockWork({ circleId: "RG002" }),
				createMockWork({ circleId: "RG003" }),
				createMockWork({ circleId: "RG003" }),
				createMockWork({ circleId: "RG003" }),
			];

			const performance = DataAggregationService.analyzeCirclePerformance(works);

			expect(performance).toHaveLength(1); // Only RG003 has 3+ works
			expect(performance[0].circleId).toBe("RG003");
		});

		it("should sort by popularity score", () => {
			const works = [
				// Low popularity circle
				createMockWork({
					circleId: "RG001",
					circle: "Circle A",
					rating: { stars: 20, count: 10 },
					wishlistCount: 50,
				}),
				createMockWork({ circleId: "RG001", circle: "Circle A" }),
				createMockWork({ circleId: "RG001", circle: "Circle A" }),
				// High popularity circle
				createMockWork({
					circleId: "RG002",
					circle: "Circle B",
					rating: { stars: 50, count: 1000 },
					wishlistCount: 5000,
				}),
				createMockWork({ circleId: "RG002", circle: "Circle B" }),
				createMockWork({ circleId: "RG002", circle: "Circle B" }),
			];

			const performance = DataAggregationService.analyzeCirclePerformance(works);

			expect(performance[0].circleId).toBe("RG002"); // Higher popularity
			expect(performance[0].metrics.popularityScore).toBeGreaterThan(
				performance[1].metrics.popularityScore,
			);
		});

		it("should limit to top 50 circles", () => {
			const works = [];
			for (let i = 0; i < 60; i++) {
				// Create 3 works for each circle to meet minimum requirement
				for (let j = 0; j < 3; j++) {
					works.push(
						createMockWork({
							circleId: `RG${i.toString().padStart(3, "0")}`,
							circle: `Circle ${i}`,
						}),
					);
				}
			}

			const performance = DataAggregationService.analyzeCirclePerformance(works);
			expect(performance).toHaveLength(50);
		});
	});
});
