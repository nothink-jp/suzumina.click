import { z } from "zod";

/**
 * Rating Value Object
 *
 * 不変で評価情報を表現する値オブジェクト
 * DLsite作品の評価データを扱う
 */
export const Rating = z
	.object({
		/** 評価星数 (1-5の範囲) */
		stars: z.number().min(0).max(5),
		/** 評価数 */
		count: z.number().int().min(0),
		/** 平均評価（小数点付き） */
		average: z.number().min(0).max(5),
		/** 評価分布（オプション） */
		distribution: z
			.object({
				1: z.number().int().min(0),
				2: z.number().int().min(0),
				3: z.number().int().min(0),
				4: z.number().int().min(0),
				5: z.number().int().min(0),
			})
			.optional(),
	})
	.transform((data) => ({
		...data,
		/** 評価があるかどうか */
		hasRatings: () => data.count > 0,
		/** 高評価かどうか（4.0以上） */
		isHighlyRated: () => data.average >= 4.0,
		/** 評価の信頼性（評価数ベース） */
		reliability: () => {
			if (data.count >= 100) return "high";
			if (data.count >= 50) return "medium";
			if (data.count >= 10) return "low";
			return "insufficient";
		},
		/** 星数の整数表現（表示用） */
		displayStars: () => Math.round(data.stars),
		/** パーセンテージ表現（0-100） */
		percentage: () => (data.average / 5) * 100,
		/** 他のRatingと等価か判定 */
		equals: (other: unknown): boolean => {
			// 入力検証: null/undefined チェック
			if (!other) return false;

			// 型ガード: Rating型かチェック
			if (typeof other !== "object") return false;
			const o = other as Record<string, unknown>;

			// 必須プロパティの存在確認
			if (
				typeof o.stars !== "number" ||
				typeof o.count !== "number" ||
				typeof o.average !== "number"
			) {
				return false;
			}

			// 安全な比較
			return data.stars === o.stars && data.count === o.count && data.average === o.average;
		},
		/** フォーマット済み文字列 */
		format: () => `★${data.average.toFixed(1)} (${data.count}件)`,
	}));

export type Rating = z.infer<typeof Rating>;
export type RatingReliability = "high" | "medium" | "low" | "insufficient";

/**
 * 評価統計
 */
export const RatingStatistics = z.object({
	/** 総評価数 */
	totalCount: z.number().int().min(0),
	/** 平均評価 */
	averageRating: z.number().min(0).max(5),
	/** 中央値 */
	median: z.number().min(1).max(5),
	/** 最頻値 */
	mode: z.number().min(1).max(5),
	/** 標準偏差 */
	standardDeviation: z.number().min(0),
});

export type RatingStatistics = z.infer<typeof RatingStatistics>;

/**
 * 評価集計ユーティリティ
 */
export const RatingAggregation = {
	/**
	 * 複数の評価から統計を計算
	 */
	calculateStatistics: (ratings: number[]): RatingStatistics | null => {
		if (ratings.length === 0) return null;

		const sum = ratings.reduce((acc, val) => acc + val, 0);
		const average = sum / ratings.length;

		// 中央値を計算
		const sorted = [...ratings].sort((a, b) => a - b);
		const midIndex = Math.floor(sorted.length / 2);
		const median =
			sorted.length % 2 === 0
				? ((sorted[midIndex - 1] ?? 0) + (sorted[midIndex] ?? 0)) / 2
				: (sorted[midIndex] ?? 0);

		// 最頻値を計算
		const frequency = ratings.reduce(
			(acc, val) => {
				acc[val] = (acc[val] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>,
		);
		const modeEntry = Object.entries(frequency).sort(([, a], [, b]) => b - a)[0];
		const mode = modeEntry ? Number(modeEntry[0]) : sorted[Math.floor(sorted.length / 2)];

		// 標準偏差を計算
		const variance = ratings.reduce((acc, val) => acc + (val - average) ** 2, 0) / ratings.length;
		const standardDeviation = Math.sqrt(variance);

		return RatingStatistics.parse({
			totalCount: ratings.length,
			averageRating: average,
			median,
			mode,
			standardDeviation,
		});
	},

	/**
	 * DLsite APIの評価値（10-50）を1-5に変換
	 */
	fromDLsiteRating: (apiRating: number): number => {
		return apiRating / 10;
	},

	/**
	 * 評価分布から平均を計算
	 */
	calculateAverageFromDistribution: (distribution: Record<number, number>): number => {
		let totalScore = 0;
		let totalCount = 0;

		for (const [rating, count] of Object.entries(distribution)) {
			totalScore += Number(rating) * count;
			totalCount += count;
		}

		return totalCount > 0 ? totalScore / totalCount : 0;
	},
};
