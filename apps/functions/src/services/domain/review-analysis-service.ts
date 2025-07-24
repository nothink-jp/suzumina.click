/**
 * Review Analysis Domain Service
 *
 * レビュー分析に関するビジネスロジックを集約
 */

import type { Rating } from "@suzumina.click/shared-types";

export class ReviewAnalysisService {
	/**
	 * レビュー分布から信頼度スコアを計算
	 * 偏りの少ない分布ほど高スコア
	 */
	static calculateReliabilityScore(distribution: number[]): number {
		const total = distribution.reduce((sum, count) => sum + count, 0);
		if (total === 0) return 0;

		// エントロピーを計算（分布の均等さの指標）
		let entropy = 0;
		for (const count of distribution) {
			if (count > 0) {
				const probability = count / total;
				entropy -= probability * Math.log2(probability);
			}
		}

		// 最大エントロピー（完全に均等な分布）
		const maxEntropy = Math.log2(distribution.length);

		// 信頼度スコア（0-100）
		// エントロピーが高い（分布が均等）ほど信頼度は高い
		// レビュー数も考慮
		const entropyScore = (entropy / maxEntropy) * 50;
		const volumeScore = Math.min(50, (Math.log10(total + 1) / 3) * 50);

		return Math.round(entropyScore + volumeScore);
	}

	/**
	 * レビューの偏りを検出
	 */
	static detectReviewBias(distribution: number[]): {
		hasBias: boolean;
		biasType?: "positive" | "negative" | "extreme";
		biasStrength?: number;
	} {
		const total = distribution.reduce((sum, count) => sum + count, 0);
		if (total < 10) {
			// レビュー数が少なすぎる場合は判定不可
			return { hasBias: false };
		}

		const percentages = distribution.map((count) => (count / total) * 100);

		// 5つ星の割合が異常に高い（80%以上）
		const fiveStarPercent = percentages[4] ?? 0;
		if (fiveStarPercent > 80) {
			return {
				hasBias: true,
				biasType: "positive",
				biasStrength: fiveStarPercent,
			};
		}

		// 1つ星の割合が異常に高い（50%以上）
		const oneStarPercent = percentages[0] ?? 0;
		if (oneStarPercent > 50) {
			return {
				hasBias: true,
				biasType: "negative",
				biasStrength: oneStarPercent,
			};
		}

		// 極端な評価（1つ星と5つ星）に偏っている
		const extremePercentage = (percentages[0] ?? 0) + (percentages[4] ?? 0);
		if (extremePercentage > 80) {
			return {
				hasBias: true,
				biasType: "extreme",
				biasStrength: extremePercentage,
			};
		}

		return { hasBias: false };
	}

	/**
	 * 重み付き平均評価を計算
	 * 新しいレビューや信頼できるレビュアーの評価を重視
	 */
	static calculateWeightedRating(
		reviews: Array<{
			rating: number;
			date: Date;
			isVerifiedPurchase?: boolean;
		}>,
	): number {
		if (reviews.length === 0) return 0;

		const now = Date.now();
		let totalWeight = 0;
		let weightedSum = 0;

		for (const review of reviews) {
			// 時間による重み（新しいレビューほど重要）
			const daysSinceReview = (now - review.date.getTime()) / (1000 * 60 * 60 * 24);
			const timeWeight = Math.exp(-daysSinceReview / 365); // 1年で約1/e

			// 購入確認済みレビューは2倍の重み
			const verificationWeight = review.isVerifiedPurchase ? 2 : 1;

			const weight = timeWeight * verificationWeight;
			totalWeight += weight;
			weightedSum += review.rating * weight;
		}

		return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
	}

	/**
	 * レビューのトレンドを分析
	 */
	static analyzeReviewTrend(
		reviews: Array<{
			rating: number;
			date: Date;
		}>,
		periodDays = 30,
	): {
		trend: "improving" | "declining" | "stable";
		recentAverage: number;
		overallAverage: number;
		trendStrength: number;
	} {
		if (reviews.length === 0) {
			return {
				trend: "stable",
				recentAverage: 0,
				overallAverage: 0,
				trendStrength: 0,
			};
		}

		const now = Date.now();
		const recentReviews = reviews.filter(
			(r) => (now - r.date.getTime()) / (1000 * 60 * 60 * 24) <= periodDays,
		);

		const overallAverage = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
		const recentAverage =
			recentReviews.length > 0
				? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
				: overallAverage;

		const difference = recentAverage - overallAverage;
		const trendStrength = Math.abs(difference);

		let trend: "improving" | "declining" | "stable";
		if (difference > 0.5) {
			trend = "improving";
		} else if (difference < -0.5) {
			trend = "declining";
		} else {
			trend = "stable";
		}

		return {
			trend,
			recentAverage: Math.round(recentAverage * 10) / 10,
			overallAverage: Math.round(overallAverage * 10) / 10,
			trendStrength: Math.round(trendStrength * 10) / 10,
		};
	}

	/**
	 * レビュー分布の正規化
	 * APIから取得した生データを正規化された形式に変換
	 */
	static normalizeReviewDistribution(rawDistribution: any, totalCount: number): number[] {
		const normalized = [0, 0, 0, 0, 0];

		if (!rawDistribution || typeof rawDistribution !== "object") {
			return normalized;
		}

		// さまざまな形式のレビュー分布に対応
		if (Array.isArray(rawDistribution)) {
			// API レスポンス形式 [{review_point: 1, count: 10}, ...]
			if (rawDistribution.length > 0 && rawDistribution[0]?.review_point !== undefined) {
				for (const item of rawDistribution) {
					const point = Number.parseInt(item.review_point);
					const count = Number.parseInt(item.count) || 0;
					if (point >= 1 && point <= 5) {
						normalized[point - 1] = count;
					}
				}
			} else {
				// 単純な配列形式 [1つ星の数, 2つ星の数, ...]
				for (let i = 0; i < 5 && i < rawDistribution.length; i++) {
					normalized[i] = Math.max(0, Number.parseInt(rawDistribution[i]) || 0);
				}
			}
		} else {
			// オブジェクト形式 { "1": 数, "2": 数, ... }
			for (let i = 1; i <= 5; i++) {
				const count = rawDistribution[i.toString()] || rawDistribution[i] || 0;
				normalized[i - 1] = Math.max(0, Number.parseInt(count) || 0);
			}
		}

		// 合計値の検証
		const sum = normalized.reduce((total, count) => total + count, 0);
		if (sum !== totalCount && totalCount > 0) {
			// 合計が一致しない場合は比率を保って調整
			const ratio = totalCount / sum;
			for (let i = 0; i < normalized.length; i++) {
				const value = normalized[i];
				if (value !== undefined) {
					normalized[i] = Math.round(value * ratio);
				}
			}
		}

		return normalized;
	}

	/**
	 * レビューから感情スコアを推定
	 * 将来的にはテキスト分析を追加可能
	 */
	static estimateSentimentScore(rating: Rating): number {
		const avgRating = rating.average;
		const distribution = rating.distribution;

		// 基本スコア（平均評価 × 20）
		let score = avgRating * 20;

		// 分布による調整
		if (distribution && typeof distribution === "object") {
			const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
			if (total > 0) {
				// ポジティブ評価（4-5つ星）の割合
				const positiveRatio = ((distribution[4] || 0) + (distribution[5] || 0)) / total;
				score += positiveRatio * 20;

				// ネガティブ評価（1-2つ星）の割合によるペナルティ
				const negativeRatio = ((distribution[1] || 0) + (distribution[2] || 0)) / total;
				score -= negativeRatio * 20;
			}
		}

		return Math.max(0, Math.min(100, Math.round(score)));
	}
}
