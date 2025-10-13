import type { WorkDocument } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * データ品質統計の型定義
 */
interface QualityStats {
	total: number;
	hasHighResImage: number;
	hasVoiceActors: number;
	hasDetailedCreators: number;
	hasRating: number;
	hasGenres: number;
	hasDataSources: number;
	dataSourceCoverage: {
		searchResult: number;
		infoAPI: number;
		detailPage: number;
		allThree: number;
	};
}

/**
 * 基本的な品質統計を更新
 */
function updateBasicQualityStats(work: WorkDocument, stats: QualityStats) {
	const hasHighRes = !!(work.highResImageUrl && work.highResImageUrl.trim() !== "");
	if (hasHighRes) stats.hasHighResImage++;
	if (work.creators?.voice_by && work.creators.voice_by.length > 0) stats.hasVoiceActors++;
	if (work.rating?.stars) stats.hasRating++;
	if (Array.isArray(work.genres) && work.genres.length > 0) stats.hasGenres++;
}

/**
 * クリエイター統計を更新
 */
function updateCreatorStats(work: WorkDocument, stats: QualityStats) {
	const hasDetailedCreators = [
		work.creators?.scenario_by,
		work.creators?.illust_by,
		work.creators?.music_by,
	].some((creators) => creators && creators.length > 0);
	if (hasDetailedCreators) stats.hasDetailedCreators++;
}

/**
 * データソース統計を更新
 */
function updateDataSourceStats(work: WorkDocument, stats: QualityStats) {
	if (work.dataSources) {
		stats.hasDataSources++;
		const sources = work.dataSources;

		if (sources.searchResult) stats.dataSourceCoverage.searchResult++;
		if (sources.infoAPI) stats.dataSourceCoverage.infoAPI++;

		if (sources.searchResult && sources.infoAPI) {
			stats.dataSourceCoverage.allThree++;
		}
	}
}

/**
 * パーセンテージ計算
 */
function calculateQualityPercentages(stats: QualityStats) {
	const total = stats.total;
	return {
		hasHighResImage: Math.round((stats.hasHighResImage / total) * 100),
		hasVoiceActors: Math.round((stats.hasVoiceActors / total) * 100),
		hasDetailedCreators: Math.round((stats.hasDetailedCreators / total) * 100),
		hasRating: Math.round((stats.hasRating / total) * 100),
		hasGenres: Math.round((stats.hasGenres / total) * 100),
		dataSourceCoverage: Math.round((stats.dataSourceCoverage.allThree / total) * 100),
	};
}

/**
 * 作品統計情報を生成
 */
export async function generateWorksStats(allWorks: WorkDocument[]) {
	try {
		// 基本統計
		const totalWorks = allWorks.length;
		const totalValue = allWorks.reduce((sum, work) => sum + (work.price?.current || 0), 0);
		const averagePrice = totalValue / totalWorks;
		const averageRating = allWorks
			.filter((work) => work.rating?.stars)
			.reduce((sum, work, _, array) => sum + (work.rating?.stars ?? 0) / array.length, 0);

		// カテゴリ別統計
		const byCategory = allWorks.reduce(
			(acc, work) => {
				const category = work.category || "unknown";
				if (!acc[category]) {
					acc[category] = {
						count: 0,
						totalValue: 0,
						totalRating: 0,
						ratingCount: 0,
					};
				}

				acc[category].count++;
				acc[category].totalValue += work.price?.current || 0;

				if (work.rating?.stars) {
					acc[category].totalRating += work.rating.stars;
					acc[category].ratingCount++;
				}

				return acc;
			},
			{} as Record<
				string,
				{
					count: number;
					totalValue: number;
					totalRating: number;
					ratingCount: number;
					averagePrice?: number;
					averageRating?: number;
				}
			>,
		);

		// カテゴリ別平均値を計算
		Object.keys(byCategory).forEach((category) => {
			const stats = byCategory[category];
			if (stats) {
				stats.averagePrice = stats.totalValue / stats.count;
				stats.averageRating = stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0;
			}
		});

		// 人気タグ（統合ジャンル活用）
		const tagCounts = new Map<string, number>();
		allWorks.forEach((work) => {
			if (Array.isArray(work.genres)) {
				work.genres.forEach((genre) => {
					if (typeof genre === "string" && genre.trim() !== "") {
						tagCounts.set(genre, (tagCounts.get(genre) || 0) + 1);
					}
				});
			}
		});

		const popularTags = Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 20)
			.map(([tag, count]) => ({ tag, count }));

		// 人気声優（統合データ活用）
		const voiceActorCounts = new Map<string, number>();
		allWorks.forEach((work) => {
			if (work.creators?.voice_by) {
				work.creators.voice_by.forEach((va) => {
					if (va.name && va.name.trim() !== "") {
						voiceActorCounts.set(va.name, (voiceActorCounts.get(va.name) || 0) + 1);
					}
				});
			}
		});

		const popularVoiceActors = Array.from(voiceActorCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([voiceActor, count]) => ({ voiceActor, count }));

		return {
			overview: {
				totalWorks,
				totalValue,
				averagePrice: Math.round(averagePrice),
				averageRating: Math.round(averageRating * 10) / 10,
			},
			byCategory,
			trends: {
				popularTags,
				popularVoiceActors,
			},
		};
	} catch (error) {
		logger.error("作品統計生成エラー", {
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			overview: {
				totalWorks: 0,
				totalValue: 0,
				averagePrice: 0,
				averageRating: 0,
			},
			byCategory: {},
			trends: {
				popularTags: [],
				popularVoiceActors: [],
			},
		};
	}
}

/**
 * データ品質レポートを生成
 */
export function generateDataQualityReport(allWorks: WorkDocument[]) {
	const qualityStats: QualityStats = {
		total: allWorks.length,
		hasHighResImage: 0,
		hasVoiceActors: 0,
		hasDetailedCreators: 0,
		hasRating: 0,
		hasGenres: 0,
		hasDataSources: 0,
		dataSourceCoverage: {
			searchResult: 0,
			infoAPI: 0,
			detailPage: 0,
			allThree: 0,
		},
	};

	allWorks.forEach((work) => {
		updateBasicQualityStats(work, qualityStats);
		updateCreatorStats(work, qualityStats);
		updateDataSourceStats(work, qualityStats);
	});

	return {
		...qualityStats,
		percentages: calculateQualityPercentages(qualityStats),
	};
}
