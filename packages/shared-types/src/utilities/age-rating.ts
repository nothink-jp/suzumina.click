/**
 * 年齢制限・レーティング関連のユーティリティ
 */

import { z } from "zod";
import type { WorkDocument } from "../entities/work";
import { Work } from "../entities/work-entity";

/**
 * 年齢制限レーティングの型定義
 */
export const AgeRatingSchema = z.enum([
	"全年齢", // 全年齢対象
	"R15", // 15歳以上推奨
	"R18", // 18歳以上推奨
	"R-15", // 15歳以上推奨（別表記）
	"R-18", // 18歳以上推奨（別表記）
	"成人向け", // 成人向け
	"18禁", // 18禁
	"Adult", // 英語表記
	"未設定", // レーティング未設定
]);

export type AgeRating = z.infer<typeof AgeRatingSchema>;

/**
 * DLsite APIの数値形式の年齢カテゴリを文字列にマッピング
 * @param numericCategory DLsite APIの数値形式の年齢カテゴリ
 * @returns 対応する年齢制限文字列
 */
export function mapNumericAgeCategory(numericCategory: number): AgeRating {
	switch (numericCategory) {
		case 1:
			return "全年齢";
		case 2:
			return "R15";
		case 3:
			return "R18";
		default:
			return "未設定";
	}
}

/**
 * 年齢制限判定の結果
 */
export interface AgeRatingCheck {
	/** R18相当かどうか */
	isR18: boolean;
	/** 全年齢対象かどうか */
	isAllAges: boolean;
	/** 元のレーティング文字列 */
	originalRating: string;
	/** 正規化されたレーティング */
	normalizedRating: AgeRating | null;
}

/**
 * R18相当の年齢制限を示すキーワード
 */
const R18_KEYWORDS = ["R18", "R-18", "18禁", "成人向け", "Adult", "18歳以上", "18才以上"];

/**
 * 全年齢対象を示すキーワード
 */
const ALL_AGES_KEYWORDS = ["全年齢", "全年令", "一般", "General", "All ages"];

/**
 * 年齢制限文字列がR18相当かどうかを判定
 * @param ageRating 年齢制限文字列
 * @returns R18相当の場合true
 */
export function isR18Content(ageRating?: string): boolean {
	// ageRatingが未設定の場合は全年齢として扱う（R18ではない）
	if (!ageRating) return false;

	const normalizedRating = ageRating.trim();

	// 空文字の場合も全年齢として扱う
	if (normalizedRating === "") return false;

	// DLsite API の数値形式の age_category への対応
	if (normalizedRating === "3") return true;

	return R18_KEYWORDS.some((keyword) => normalizedRating.includes(keyword));
}

/**
 * 年齢制限文字列が全年齢対象かどうかを判定
 * @param ageRating 年齢制限文字列
 * @returns 全年齢対象の場合true
 */
export function isAllAgesContent(ageRating?: string): boolean {
	if (!ageRating) return false;

	const normalizedRating = ageRating.trim();

	// DLsite API の数値形式の age_category への対応
	if (normalizedRating === "1") return true;

	return ALL_AGES_KEYWORDS.some((keyword) => normalizedRating.includes(keyword));
}

/**
 * 年齢制限を包括的にチェック
 * @param ageRating 年齢制限文字列
 * @returns 年齢制限判定結果
 */
export function checkAgeRating(ageRating?: string): AgeRatingCheck {
	const originalRating = ageRating || "";

	// DLsite API の数値形式の age_category への対応
	// "3" -> "R18", "1" -> "全年齢", "2" -> "R15"
	if (ageRating === "3") {
		return {
			isR18: true,
			isAllAges: false,
			originalRating,
			normalizedRating: "R18",
		};
	}
	if (ageRating === "1") {
		return {
			isR18: false,
			isAllAges: true,
			originalRating,
			normalizedRating: "全年齢",
		};
	}
	if (ageRating === "2") {
		return {
			isR18: false,
			isAllAges: false,
			originalRating,
			normalizedRating: "R15",
		};
	}

	const isR18 = isR18Content(ageRating);
	const isAllAges = isAllAgesContent(ageRating);

	// 正規化処理
	let normalizedRating: AgeRating | null = null;
	if (isR18) {
		normalizedRating = "R18";
	} else if (isAllAges) {
		normalizedRating = "全年齢";
	} else if (ageRating?.includes("R15") || ageRating?.includes("R-15")) {
		normalizedRating = "R15";
	} else if (ageRating) {
		normalizedRating = "未設定";
	}

	return {
		isR18,
		isAllAges,
		originalRating,
		normalizedRating,
	};
}

/**
 * 18歳未満ユーザー向けにR18コンテンツを除外
 * @param items フィルタリング対象のアイテム配列
 * @param getAgeRating アイテムから年齢制限を取得する関数
 * @returns フィルタリング済みアイテム配列
 *
 * NOTE: 内部実装はWork.isAdultContent()を使用するように更新されました。
 * getAgeRatingパラメータは互換性のために残されていますが、将来的に削除される可能性があります。
 */
export function filterR18Content<T>(
	items: T[],
	getAgeRating: (item: T) => string | undefined,
): T[] {
	return items.filter((item) => {
		// Try to use Work entity if the item is a Firestore work data
		if (isFirestoreWorkData(item)) {
			const work = Work.fromFirestoreData(item);
			if (work) {
				return !work.isAdultContent();
			}
		}

		// Fallback to legacy implementation for backward compatibility
		const ageRating = getAgeRating(item);
		return !isR18Content(ageRating);
	});
}

/**
 * Type guard to check if an item is WorkDocument
 */
function isFirestoreWorkData(item: unknown): item is WorkDocument {
	return (
		typeof item === "object" &&
		item !== null &&
		"productId" in item &&
		"title" in item &&
		"price" in item &&
		typeof (item as Record<string, unknown>).price === "object"
	);
}

/**
 * 年齢制限による表示名取得
 * @param ageRating 年齢制限文字列
 * @returns 表示用の年齢制限名
 */
export function getAgeRatingDisplayName(ageRating?: string): string {
	const check = checkAgeRating(ageRating);

	if (check.normalizedRating) {
		return check.normalizedRating;
	}

	return check.originalRating || "未設定";
}
