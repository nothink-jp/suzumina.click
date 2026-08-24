/**
 * 年齢制限・レーティング関連のユーティリティ
 */

import { z } from "zod";
import type { WorkDocument } from "../entities/work";

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
 * Firestore の `works.ageRating` に実在する「R18 ではない」値の集合（SPR-321）。
 *
 * `isR18Content()` は denylist（R18 らしいキーワードを含むか）で判定するため、
 * **Firestore クエリには載らない**（部分一致は where で表現できない）。
 * 一覧を「非 R18 だけ」に絞るクエリのために、実データから列挙した allowlist をここに置く。
 *
 * **この 3 値の正本は取り込み側の `mapAgeRating()`**（`apps/functions/src/services/mappers/work-mapper.ts`）。
 * DLsite の `age_category` を 1→"全年齢" / 2→"R15" / 3→"R18" に正規化し、**未知の値は `undefined`**（フィールド自体が無い）。
 * したがってここは「実データがたまたまこの 3 値だった」のではなく、**書き込み側の値域をそのまま写している**。
 * `mapAgeRating()` の対応表を変えるときは、必ずこの定数も一緒に変えること。
 * 本番実測（2026-08-24）でも R18 2,154 / 全年齢 26 / R15 11 = 2,191・欠損ゼロで一致している。
 *
 * `isR18Content()` の隣に置いてあるのは、あちらが denylist の部分一致（Firestore クエリに載らない）で
 * 同じ判断を別の方法で行っており、**両者が食い違うと表示が壊れる**ため。
 *
 * 未知の区分（`ageRating` が無い doc）はこの `in` に一致しないため匿名ユーザーの一覧に出ない（fail-closed）。
 * `isR18Content(undefined)` が false＝非 R18 扱い（fail-open）なのとは逆だが、
 * 表示側の既定（`showR18 ?? false`）と失敗方向が揃うのはこちら。
 */
export const NON_R18_AGE_RATINGS = ["全年齢", "R15"] as const;

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
		// Check if the item has an ageRating field directly
		if (isFirestoreWorkData(item)) {
			const workData = item as unknown as WorkDocument;
			const ageRating = workData.ageRating || workData.ageCategoryString;
			return !isR18Content(ageRating);
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
