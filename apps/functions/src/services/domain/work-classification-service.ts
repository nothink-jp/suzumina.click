/**
 * Work Classification Domain Service
 *
 * 作品の分類・カテゴライズに関するビジネスロジックを集約
 *
 * NOTE: フロントエンドで使用されていないメソッドは削除されました。
 * 削除されたメソッド:
 * - isASMRContent(): Cloud Functions内部でのみ使用
 * - normalizeTags(): Cloud Functions内部でのみ使用
 * - isSeriesWork(): Cloud Functions内部でのみ使用
 * - estimateTargetAudience(): Cloud Functions内部でのみ使用
 * - calculateSimilarityScore(): Web appには別実装あり
 */

import type { WorkDocument } from "@suzumina.click/shared-types";
import { Work } from "@suzumina.click/shared-types";

export class WorkClassificationService {
	/**
	 * 作品のメインカテゴリを判定
	 *
	 * @deprecated Work.determineMainCategory() を直接使用することを推奨
	 */
	static determineMainCategory(work: WorkDocument): string {
		try {
			const workEntity = Work.fromFirestoreData(work);
			if (!workEntity) {
				return WorkClassificationService.determineMainCategoryFromFormat(work.workFormat);
			}
			return workEntity.determineMainCategory();
		} catch (_error) {
			// On any error, return "other"
			return "other";
		}
	}

	/**
	 * 作品フォーマットから直接カテゴリを判定
	 * @private
	 */
	private static determineMainCategoryFromFormat(workFormat?: string): string {
		const format = workFormat?.toLowerCase() || "";

		const categoryMap: Array<[string[], string]> = [
			[["voice", "音声", "ボイス"], "voice"],
			[["game", "ゲーム"], "game"],
			[["comic", "manga", "漫画"], "comic"],
			[["cg", "illust", "イラスト"], "illustration"],
			[["novel", "小説"], "novel"],
			[["video", "動画"], "video"],
		];

		for (const [keywords, category] of categoryMap) {
			if (keywords.some((keyword) => format.includes(keyword))) {
				return category;
			}
		}

		return "other";
	}

	/**
	 * R18コンテンツかどうか判定
	 *
	 * @deprecated Work.isAdultContent() を使用してください
	 */
	static isAdultContent(work: WorkDocument): boolean {
		// ageRating から判定
		const ageRating = work.ageRating || "";
		return ageRating === "R18" || ageRating.includes("18") || ageRating === "Adult";
	}

	/**
	 * 作品の人気度を計算（1-100のスコア）
	 *
	 * @deprecated Work.calculatePopularityScore() を直接使用することを推奨
	 */
	static calculatePopularityScore(work: WorkDocument): number {
		try {
			const workEntity = Work.fromFirestoreData(work);
			if (!workEntity) {
				// Fallback to direct calculation if entity creation fails
				let score = 0;

				// レビュー評価による加点（最大40点）
				if (work.rating?.stars) {
					score += (work.rating.stars / 50) * 40;
				}

				// レビュー数による加点（最大30点）
				const reviewCount = work.rating?.count || 0;
				if (reviewCount > 0) {
					// 対数スケールで計算（1000件で満点）
					score += Math.min(30, (Math.log10(reviewCount + 1) / 3) * 30);
				}

				// 新作ボーナス（最大10点）
				if (work.releaseDateISO) {
					const releaseDate = new Date(work.releaseDateISO);
					const daysSinceRelease = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
					if (daysSinceRelease < 30) {
						score += 10 * (1 - daysSinceRelease / 30);
					}
				}

				return Math.round(Math.min(100, score));
			}
			return workEntity.calculatePopularityScore();
		} catch (_error) {
			// On any error, return 0
			return 0;
		}
	}
}
