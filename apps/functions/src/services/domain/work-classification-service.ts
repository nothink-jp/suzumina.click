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

import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";

export class WorkClassificationService {
	/**
	 * 作品のメインカテゴリを判定
	 *
	 * NOTE: workFormatベースの判定のみ残されています。
	 * categoryベースの判定はWorkエンティティのメソッドを使用してください。
	 */
	static determineMainCategory(work: OptimizedFirestoreDLsiteWorkData): string {
		// workFormat から主要カテゴリを判定
		const format = work.workFormat?.toLowerCase() || "";

		if (format.includes("voice") || format.includes("音声") || format.includes("ボイス")) {
			return "voice";
		}
		if (format.includes("game") || format.includes("ゲーム")) {
			return "game";
		}
		if (format.includes("comic") || format.includes("manga") || format.includes("漫画")) {
			return "comic";
		}
		if (format.includes("cg") || format.includes("illust") || format.includes("イラスト")) {
			return "illustration";
		}
		if (format.includes("novel") || format.includes("小説")) {
			return "novel";
		}
		if (format.includes("video") || format.includes("動画")) {
			return "video";
		}

		return "other";
	}

	/**
	 * R18コンテンツかどうか判定
	 *
	 * @deprecated Work.isAdultContent() を使用してください
	 */
	static isAdultContent(work: OptimizedFirestoreDLsiteWorkData): boolean {
		// ageRating から判定
		const ageRating = work.ageRating || "";
		return ageRating === "R18" || ageRating.includes("18") || ageRating === "Adult";
	}

	/**
	 * 作品の人気度を計算（1-100のスコア）
	 *
	 * NOTE: 新作ボーナスの計算はWork.isNewRelease()を併用することを推奨
	 */
	static calculatePopularityScore(work: OptimizedFirestoreDLsiteWorkData): number {
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

		// ウィッシュリスト数による加点は廃止（DLsite API提供終了のため）
		// 代わりに評価とレビュー数の重みを調整

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
}
