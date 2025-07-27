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
		const workEntity = Work.fromFirestoreData(work);
		return workEntity?.determineMainCategory() || "other";
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
		const workEntity = Work.fromFirestoreData(work);
		return workEntity?.calculatePopularityScore() || 0;
	}
}
