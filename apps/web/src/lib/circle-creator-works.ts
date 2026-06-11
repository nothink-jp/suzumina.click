/**
 * circle / creator の作品リストページ共通ロジック（WorkPlainObject 対象）。
 *
 * works 一覧（`app/works/lib/`）のソート・フィルタは WorkDocument 対象で
 * レイヤーが異なるため共用しない。本モジュールは circle/creator 間の重複解消に限定する（SPR-185）。
 *
 * 「人気順(popular)」は rating.stars 基準。works 一覧（rating.count 基準）との
 * 意味統一は SPR-190 で別途扱う。
 */

import type { WorkPlainObject } from "@suzumina.click/shared-types";

function compareByDate(a: WorkPlainObject, b: WorkPlainObject, isOldest = false): number {
	// releaseDateISO → registDate → "1900-01-01" の順でフォールバック。
	// 旧 circle 版は registDate フォールバックを欠いていたが、より頑健な creator 版に統一。
	const dateA = a.releaseDateISO || a.registDate || "1900-01-01";
	const dateB = b.releaseDateISO || b.registDate || "1900-01-01";
	if (dateA === dateB) {
		return isOldest
			? a.productId.localeCompare(b.productId)
			: b.productId.localeCompare(a.productId);
	}
	return isOldest ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
}

function compareByRating(a: WorkPlainObject, b: WorkPlainObject): number {
	return (b.rating?.stars || 0) - (a.rating?.stars || 0);
}

function compareByPrice(a: WorkPlainObject, b: WorkPlainObject, isHighToLow = false): number {
	const priceA = a.price?.current || 0;
	const priceB = b.price?.current || 0;
	return isHighToLow ? priceB - priceA : priceA - priceB;
}

/**
 * circle / creator 共通のソート比較関数。
 */
export function compareWorks(a: WorkPlainObject, b: WorkPlainObject, sort: string): number {
	switch (sort) {
		case "oldest":
			return compareByDate(a, b, true);
		case "popular":
			return compareByRating(a, b);
		case "price_low":
			return compareByPrice(a, b, false);
		case "price_high":
			return compareByPrice(a, b, true);
		default:
			return compareByDate(a, b, false); // newest
	}
}

/**
 * circle / creator 共通の検索フィルタ（タイトル / 説明 / 声優名 / ジャンル）。
 * @returns filtered と、検索時のみ件数 count
 */
export function searchWorks(
	works: WorkPlainObject[],
	search?: string,
): { filtered: WorkPlainObject[]; count?: number } {
	if (!search) {
		return { filtered: works };
	}

	const searchLower = search.toLowerCase();
	const filtered = works.filter((work) => {
		if (work.title?.toLowerCase().includes(searchLower)) return true;
		if (work.description?.toLowerCase().includes(searchLower)) return true;
		if (work.creators?.voiceActors?.some((va) => va.name?.toLowerCase().includes(searchLower))) {
			return true;
		}
		if (work.genres?.some((genre) => genre.toLowerCase().includes(searchLower))) return true;
		if (work.customGenres?.some((genre) => genre.toLowerCase().includes(searchLower))) return true;
		return false;
	});

	return { filtered, count: filtered.length };
}
