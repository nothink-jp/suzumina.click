import type { AudioButton } from "@suzumina.click/shared-types";

/**
 * Firestoreクエリにフィルタを適用
 */
export function applyFilters(
	queryRef: FirebaseFirestore.Query,
	onlyPublic: boolean,
	videoId?: string,
): FirebaseFirestore.Query {
	let filteredQuery = queryRef;

	if (onlyPublic) {
		filteredQuery = filteredQuery.where("isPublic", "==", true) as typeof filteredQuery;
	}

	if (videoId) {
		// Use videoId field (unified naming)
		filteredQuery = filteredQuery.where("videoId", "==", videoId) as typeof filteredQuery;
	}

	return filteredQuery;
}

/**
 * Firestoreクエリにソート条件を適用
 */
export function applySorting(
	queryRef: FirebaseFirestore.Query,
	sortBy: "newest" | "oldest" | "popular" | "mostPlayed",
): FirebaseFirestore.Query {
	switch (sortBy) {
		case "newest":
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
		case "mostPlayed":
			return queryRef.orderBy("playCount", "desc") as typeof queryRef;
		default:
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
	}
}

/**
 * 検索フィルタを適用
 */
export function filterBySearch(buttons: AudioButton[], search: string): AudioButton[] {
	const searchLower = search.toLowerCase();
	return buttons.filter((button) => {
		const titleMatch = button.buttonText.toLowerCase().includes(searchLower);
		const descriptionMatch = button.description?.toLowerCase().includes(searchLower) || false;
		return titleMatch || descriptionMatch;
	});
}

/**
 * タグでフィルタリング（AND検索）
 */
export function filterByTags(buttons: AudioButton[], tags: string[]): AudioButton[] {
	return buttons.filter((button) => {
		if (!button.tags || button.tags.length === 0) return false;

		return tags.every((searchTag) => {
			// 完全一致を試す
			const exactMatch = button.tags?.includes(searchTag);
			// 大文字小文字を無視した比較
			const caseInsensitiveMatch = button.tags?.some(
				(buttonTag) => buttonTag.toLowerCase() === searchTag.toLowerCase(),
			);
			// トリムした比較
			const trimmedMatch = button.tags?.some((buttonTag) => buttonTag.trim() === searchTag.trim());

			return exactMatch || caseInsensitiveMatch || trimmedMatch;
		});
	});
}
