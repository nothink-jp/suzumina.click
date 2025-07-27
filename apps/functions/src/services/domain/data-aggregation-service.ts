/**
 * Data Aggregation Domain Service
 *
 * データ集約・統計処理に関するビジネスロジックを集約
 */

import type { WorkDocument } from "@suzumina.click/shared-types";
import { WorkClassificationService } from "./work-classification-service";

export interface WorkStatistics {
	totalWorks: number;
	categoryCounts: Record<string, number>;
	priceRanges: {
		under1000: number;
		under3000: number;
		under5000: number;
		over5000: number;
	};
	averagePrice: number;
	medianPrice: number;
	topCircles: Array<{
		circleId: string;
		circleName: string;
		workCount: number;
	}>;
	genreDistribution: Record<string, number>;
	lastUpdated: Date;
}

export class DataAggregationService {
	/**
	 * 作品コレクションの統計情報を集計
	 */
	static aggregateWorkStatistics(works: WorkDocument[]): WorkStatistics {
		const categoryCounts: Record<string, number> = {};
		const priceRanges = {
			under1000: 0,
			under3000: 0,
			under5000: 0,
			over5000: 0,
		};
		const circleWorkCounts: Map<string, { name: string; count: number }> = new Map();
		const genreDistribution: Record<string, number> = {};
		const prices: number[] = [];

		// 各作品を処理
		for (const work of works) {
			// カテゴリ分類
			const category = WorkClassificationService.determineMainCategory(work);
			categoryCounts[category] = (categoryCounts[category] || 0) + 1;

			// 価格帯分類
			const price = work.price.current;
			prices.push(price);
			if (price < 1000) priceRanges.under1000++;
			else if (price < 3000) priceRanges.under3000++;
			else if (price < 5000) priceRanges.under5000++;
			else priceRanges.over5000++;

			// サークル別集計
			const circleId = work.circleId || work.circle;
			const circleData = circleWorkCounts.get(circleId) || {
				name: work.circle,
				count: 0,
			};
			circleData.count++;
			circleWorkCounts.set(circleId, circleData);

			// ジャンル分布
			for (const genre of work.genres) {
				genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
			}
		}

		// 価格統計の計算
		const averagePrice =
			prices.length > 0 ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) : 0;

		const sortedPrices = [...prices].sort((a, b) => a - b);
		const medianPrice =
			prices.length > 0
				? prices.length % 2 === 0
					? Math.round(
							(sortedPrices[Math.floor(prices.length / 2) - 1]! +
								sortedPrices[Math.floor(prices.length / 2)]!) /
								2,
						)
					: sortedPrices[Math.floor(prices.length / 2)]!
				: 0;

		// トップサークルの抽出（上位10）
		const topCircles = Array.from(circleWorkCounts.entries())
			.map(([id, data]) => ({
				circleId: id,
				circleName: data.name,
				workCount: data.count,
			}))
			.sort((a, b) => b.workCount - a.workCount)
			.slice(0, 10);

		return {
			totalWorks: works.length,
			categoryCounts,
			priceRanges,
			averagePrice,
			medianPrice: medianPrice || 0,
			topCircles,
			genreDistribution,
			lastUpdated: new Date(),
		};
	}

	/**
	 * 月別の売上トレンドを集計
	 */
	static aggregateMonthlySalesTrend(
		works: WorkDocument[],
		months = 12,
	): Array<{
		month: string;
		releaseCount: number;
		averagePrice: number;
		totalRevenuePotential: number;
	}> {
		const now = new Date();
		const trends: Map<
			string,
			{
				releaseCount: number;
				totalPrice: number;
				totalRevenuePotential: number;
			}
		> = new Map();

		// 過去N月分の月キーを生成
		for (let i = 0; i < months; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			trends.set(monthKey, {
				releaseCount: 0,
				totalPrice: 0,
				totalRevenuePotential: 0,
			});
		}

		// 作品を月別に集計
		for (const work of works) {
			if (!work.releaseDateISO) continue;
			const releaseDate = new Date(work.releaseDateISO);
			const monthKey = `${releaseDate.getFullYear()}-${String(releaseDate.getMonth() + 1).padStart(2, "0")}`;

			const trend = trends.get(monthKey);
			if (trend) {
				trend.releaseCount++;
				trend.totalPrice += work.price.current;
				// 推定売上（価格 × 評価数を売上の代理指標として使用）
				const reviewCount = work.rating?.count || 1;
				trend.totalRevenuePotential += work.price.current * reviewCount;
			}
		}

		// 結果を配列に変換
		return Array.from(trends.entries())
			.map(([month, data]) => ({
				month,
				releaseCount: data.releaseCount,
				averagePrice: data.releaseCount > 0 ? Math.round(data.totalPrice / data.releaseCount) : 0,
				totalRevenuePotential: data.totalRevenuePotential,
			}))
			.reverse(); // 古い月から新しい月の順に並べ替え
	}

	/**
	 * 人気ジャンルのトレンドを分析
	 */
	static analyzeGenreTrends(
		works: WorkDocument[],
		periodDays = 90,
	): Array<{
		genre: string;
		totalWorks: number;
		recentWorks: number;
		growthRate: number;
		averageRating: number;
		averagePrice: number;
	}> {
		const now = new Date();
		const recentThreshold = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

		const genreStats: Map<
			string,
			{
				totalWorks: number;
				recentWorks: number;
				totalRating: number;
				totalPrice: number;
				ratingCount: number;
			}
		> = new Map();

		// ジャンル別に集計
		for (const work of works) {
			if (!work.releaseDateISO) continue;
			const isRecent = new Date(work.releaseDateISO) >= recentThreshold;

			for (const genre of work.genres) {
				const stats = genreStats.get(genre) || {
					totalWorks: 0,
					recentWorks: 0,
					totalRating: 0,
					totalPrice: 0,
					ratingCount: 0,
				};

				stats.totalWorks++;
				if (isRecent) stats.recentWorks++;

				stats.totalPrice += work.price.current;
				if (work.rating?.stars) {
					stats.totalRating += work.rating.stars;
					stats.ratingCount++;
				}

				genreStats.set(genre, stats);
			}
		}

		// 結果を配列に変換して分析
		return Array.from(genreStats.entries())
			.map(([genre, stats]) => {
				const oldWorks = stats.totalWorks - stats.recentWorks;
				const growthRate = oldWorks > 0 ? ((stats.recentWorks - oldWorks) / oldWorks) * 100 : 0;

				return {
					genre,
					totalWorks: stats.totalWorks,
					recentWorks: stats.recentWorks,
					growthRate: Math.round(growthRate),
					averageRating:
						stats.ratingCount > 0
							? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10
							: 0,
					averagePrice: Math.round(stats.totalPrice / stats.totalWorks),
				};
			})
			.sort((a, b) => b.totalWorks - a.totalWorks)
			.slice(0, 20); // 上位20ジャンル
	}

	/**
	 * サークルのパフォーマンス分析
	 */
	static analyzeCirclePerformance(works: WorkDocument[]): Array<{
		circleId: string;
		circleName: string;
		metrics: {
			totalWorks: number;
			averageRating: number;
			averagePrice: number;
			priceRange: { min: number; max: number };
			popularityScore: number;
			releaseFrequency: number; // 作品/月
		};
	}> {
		const circleData: Map<
			string,
			{
				name: string;
				works: WorkDocument[];
			}
		> = new Map();

		// サークル別に作品を分類
		for (const work of works) {
			const circleId = work.circleId || work.circle;
			const data = circleData.get(circleId) || {
				name: work.circle,
				works: [],
			};
			data.works.push(work);
			circleData.set(circleId, data);
		}

		// 各サークルの分析
		return Array.from(circleData.entries())
			.map(([circleId, data]) => {
				const works = data.works;
				const prices = works.map((w) => w.price.current);
				const ratings = works.filter((w) => w.rating?.stars).map((w) => w.rating!.stars);

				// リリース頻度の計算
				const releaseDates = works
					.filter((w) => w.releaseDateISO)
					.map((w) => new Date(w.releaseDateISO!));
				const oldestRelease = Math.min(...releaseDates.map((d) => d.getTime()));
				const monthsSinceFirst = (Date.now() - oldestRelease) / (1000 * 60 * 60 * 24 * 30);
				const releaseFrequency = works.length / Math.max(1, monthsSinceFirst);

				// 人気度スコアの集計
				const totalPopularity = works.reduce(
					(sum, work) => sum + WorkClassificationService.calculatePopularityScore(work),
					0,
				);

				return {
					circleId,
					circleName: data.name,
					metrics: {
						totalWorks: works.length,
						averageRating:
							ratings.length > 0
								? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
								: 0,
						averagePrice: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
						priceRange: {
							min: Math.min(...prices),
							max: Math.max(...prices),
						},
						popularityScore: Math.round(totalPopularity / works.length),
						releaseFrequency: Math.round(releaseFrequency * 10) / 10,
					},
				};
			})
			.filter((circle) => circle.metrics.totalWorks >= 3) // 3作品以上のサークルのみ
			.sort((a, b) => b.metrics.popularityScore - a.metrics.popularityScore)
			.slice(0, 50); // 上位50サークル
	}
}
