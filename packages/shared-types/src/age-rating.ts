/**
 * 年齢制限・レーティング関連のユーティリティ
 */

import { z } from "zod";

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

	return ALL_AGES_KEYWORDS.some((keyword) => normalizedRating.includes(keyword));
}

/**
 * 年齢制限を包括的にチェック
 * @param ageRating 年齢制限文字列
 * @returns 年齢制限判定結果
 */
export function checkAgeRating(ageRating?: string): AgeRatingCheck {
	const originalRating = ageRating || "";
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
 */
export function filterR18Content<T>(
	items: T[],
	getAgeRating: (item: T) => string | undefined,
): T[] {
	return items.filter((item) => {
		const ageRating = getAgeRating(item);
		return !isR18Content(ageRating);
	});
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
