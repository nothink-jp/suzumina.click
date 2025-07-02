import { z } from "zod";

/**
 * 時系列データ関連の型定義
 * 価格推移・販売推移・ランキング推移の管理
 */

/**
 * 時系列データポイントの基本スキーマ
 */
export const TimeSeriesDataPointSchema = z.object({
	/** 日付（ISO形式） */
	date: z.string().datetime(),
	/** データ取得時刻（ISO形式） */
	fetchedAt: z.string().datetime(),
	/** データソース */
	source: z.enum(["dlsite", "manual", "estimated"]).default("dlsite"),
});

/**
 * 価格推移データのZodスキーマ定義
 */
export const PriceHistoryPointSchema = TimeSeriesDataPointSchema.extend({
	/** 現在価格（円） */
	currentPrice: z.number().int().nonnegative(),
	/** 元価格（セール時、円） */
	originalPrice: z.number().int().nonnegative().optional(),
	/** 割引率（％） */
	discountRate: z.number().int().min(0).max(100).optional(),
	/** セールタイプ */
	saleType: z.enum(["normal", "campaign", "timesale", "pointup"]).optional(),
	/** セール終了日 */
	saleEndDate: z.string().datetime().optional(),
	/** ポイント還元率（％） */
	pointRate: z.number().int().min(0).max(100).optional(),
});

/**
 * 販売推移データのZodスキーマ定義
 */
export const SalesHistoryPointSchema = TimeSeriesDataPointSchema.extend({
	/** 累計販売数 */
	totalSales: z.number().int().nonnegative(),
	/** 期間販売数（前回データポイントからの増加分） */
	periodSales: z.number().int().nonnegative().optional(),
	/** 日別平均販売数（推定） */
	dailyAverageSales: z.number().nonnegative().optional(),
	/** 販売順位（カテゴリ内） */
	salesRank: z.number().int().positive().optional(),
	/** 販売ランキングカテゴリ */
	salesRankCategory: z.string().optional(),
});

/**
 * ランキング推移データのZodスキーマ定義
 */
export const RankingHistoryPointSchema = TimeSeriesDataPointSchema.extend({
	/** ランキング順位 */
	rank: z.number().int().positive(),
	/** ランキングカテゴリ */
	category: z.string(),
	/** ランキング期間 */
	term: z.enum(["daily", "weekly", "monthly", "yearly", "total"]),
	/** ランキングタイプ */
	type: z.enum(["sales", "popular", "new", "review"]).default("sales"),
	/** 対象期間の開始日 */
	periodStart: z.string().datetime().optional(),
	/** 対象期間の終了日 */
	periodEnd: z.string().datetime().optional(),
});

/**
 * レビュー推移データのZodスキーマ定義
 */
export const ReviewHistoryPointSchema = TimeSeriesDataPointSchema.extend({
	/** 総レビュー数 */
	totalReviews: z.number().int().nonnegative(),
	/** 平均評価 */
	averageRating: z.number().min(0).max(5),
	/** 星別レビュー分布 */
	ratingDistribution: z.object({
		"1": z.number().int().nonnegative().default(0),
		"2": z.number().int().nonnegative().default(0),
		"3": z.number().int().nonnegative().default(0),
		"4": z.number().int().nonnegative().default(0),
		"5": z.number().int().nonnegative().default(0),
	}),
	/** 期間レビュー数（前回データポイントからの増加分） */
	periodReviews: z.number().int().nonnegative().optional(),
});

/**
 * 作品の時系列データ集約スキーマ
 */
export const WorkTimeSeriesDataSchema = z.object({
	/** 作品ID */
	workId: z.string(),
	/** 価格推移データ */
	priceHistory: z.array(PriceHistoryPointSchema).default([]),
	/** 販売推移データ */
	salesHistory: z.array(SalesHistoryPointSchema).default([]),
	/** ランキング推移データ */
	rankingHistory: z.array(RankingHistoryPointSchema).default([]),
	/** レビュー推移データ */
	reviewHistory: z.array(ReviewHistoryPointSchema).default([]),
	/** 最終更新日 */
	lastUpdated: z.string().datetime(),
	/** データ収集開始日 */
	trackingStarted: z.string().datetime(),
});

/**
 * チャート表示用のデータポイント
 */
export const ChartDataPointSchema = z.object({
	/** X軸の値（通常は日付） */
	x: z.union([z.string(), z.number()]),
	/** Y軸の値 */
	y: z.number(),
	/** 追加情報（ツールチップ用） */
	label: z.string().optional(),
	/** データポイントの色 */
	color: z.string().optional(),
});

/**
 * チャート設定のZodスキーマ定義
 */
export const ChartConfigSchema = z.object({
	/** チャートタイトル */
	title: z.string(),
	/** X軸ラベル */
	xAxisLabel: z.string(),
	/** Y軸ラベル */
	yAxisLabel: z.string(),
	/** チャートタイプ */
	chartType: z.enum(["line", "bar", "area", "scatter"]).default("line"),
	/** 表示期間 */
	dateRange: z
		.object({
			start: z.string().datetime(),
			end: z.string().datetime(),
		})
		.optional(),
	/** Y軸の範囲 */
	yAxisRange: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
		})
		.optional(),
});

/**
 * 統計サマリーのZodスキーマ定義
 */
export const TimeSeriesStatsSchema = z.object({
	/** 期間 */
	period: z.object({
		start: z.string().datetime(),
		end: z.string().datetime(),
	}),
	/** 価格統計 */
	priceStats: z
		.object({
			current: z.number().int().nonnegative(),
			highest: z.number().int().nonnegative(),
			lowest: z.number().int().nonnegative(),
			averageDiscount: z.number().min(0).max(100).optional(),
			saleFrequency: z.number().min(0).max(1).optional(), // セールの頻度（0-1）
		})
		.optional(),
	/** 販売統計 */
	salesStats: z
		.object({
			totalSales: z.number().int().nonnegative(),
			peakDailySales: z.number().int().nonnegative(),
			averageDailySales: z.number().nonnegative(),
			growthRate: z.number().optional(), // 成長率（前期比）
		})
		.optional(),
	/** ランキング統計 */
	rankingStats: z
		.object({
			bestRank: z.number().int().positive(),
			averageRank: z.number().positive(),
			daysInTop10: z.number().int().nonnegative(),
			daysInTop100: z.number().int().nonnegative(),
		})
		.optional(),
});

// 型エクスポート
export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;
export type SalesHistoryPoint = z.infer<typeof SalesHistoryPointSchema>;
export type RankingHistoryPoint = z.infer<typeof RankingHistoryPointSchema>;
export type ReviewHistoryPoint = z.infer<typeof ReviewHistoryPointSchema>;
export type WorkTimeSeriesData = z.infer<typeof WorkTimeSeriesDataSchema>;
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type TimeSeriesStats = z.infer<typeof TimeSeriesStatsSchema>;

/**
 * 時系列データの分析ヘルパー関数
 */

/**
 * 価格推移から統計を計算
 */
export function calculatePriceStats(
	priceHistory: PriceHistoryPoint[],
): TimeSeriesStats["priceStats"] {
	if (priceHistory.length === 0) return undefined;

	const prices = priceHistory.map((p) => p.currentPrice);
	const discounts = priceHistory.filter((p) => p.discountRate).map((p) => p.discountRate || 0);
	const salesCount = priceHistory.filter((p) => p.discountRate && p.discountRate > 0).length;

	return {
		current: prices[prices.length - 1] || 0,
		highest: Math.max(...prices),
		lowest: Math.min(...prices),
		averageDiscount:
			discounts.length > 0 ? discounts.reduce((a, b) => a + b) / discounts.length : undefined,
		saleFrequency: salesCount / priceHistory.length,
	};
}

/**
 * 販売推移から統計を計算
 */
export function calculateSalesStats(
	salesHistory: SalesHistoryPoint[],
): TimeSeriesStats["salesStats"] {
	if (salesHistory.length === 0) return undefined;

	const totalSales = salesHistory[salesHistory.length - 1]?.totalSales || 0;
	const dailySales = salesHistory.map((s) => s.dailyAverageSales || 0).filter((s) => s > 0);

	return {
		totalSales,
		peakDailySales: Math.max(...dailySales, 0),
		averageDailySales:
			dailySales.length > 0 ? dailySales.reduce((a, b) => a + b) / dailySales.length : 0,
		growthRate:
			salesHistory.length >= 2 && salesHistory[0]?.totalSales
				? (((salesHistory[salesHistory.length - 1]?.totalSales || 0) -
						(salesHistory[0]?.totalSales || 0)) /
						(salesHistory[0]?.totalSales || 1)) *
					100
				: undefined,
	};
}

/**
 * ランキング推移から統計を計算
 */
export function calculateRankingStats(
	rankingHistory: RankingHistoryPoint[],
): TimeSeriesStats["rankingStats"] {
	if (rankingHistory.length === 0) return undefined;

	const ranks = rankingHistory.map((r) => r.rank);
	const top10Days = rankingHistory.filter((r) => r.rank <= 10).length;
	const top100Days = rankingHistory.filter((r) => r.rank <= 100).length;

	return {
		bestRank: Math.min(...ranks),
		averageRank: ranks.reduce((a, b) => a + b) / ranks.length,
		daysInTop10: top10Days,
		daysInTop100: top100Days,
	};
}

/**
 * チャート用データの変換
 */
export function convertToChartData(
	timeSeriesData: (PriceHistoryPoint | SalesHistoryPoint | RankingHistoryPoint)[],
	valueKey: keyof (PriceHistoryPoint & SalesHistoryPoint & RankingHistoryPoint),
): ChartDataPoint[] {
	return timeSeriesData.map((point) => {
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic property access for chart data conversion
		const value = (point as any)[valueKey];
		return {
			x: point.date,
			y: typeof value === "number" ? value : 0,
			label: new Date(point.date).toLocaleDateString("ja-JP"),
		};
	});
}
