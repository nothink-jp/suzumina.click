import type { AudioButton } from "@suzumina.click/shared-types";

/**
 * 公開一覧向けの Firestore フィルタを適用する。
 * `isPublic == true` は常に強制する（呼び出し側から外せない＝SPR-332）。
 * 所有者向けに非公開を含める一覧が要るなら、認可付きの別関数として分ける
 */
export function applyFilters(
	queryRef: FirebaseFirestore.Query,
	videoId?: string,
): FirebaseFirestore.Query {
	let filteredQuery = queryRef.where("isPublic", "==", true) as FirebaseFirestore.Query;

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
	sortBy: AudioButtonSortBy,
): FirebaseFirestore.Query {
	switch (sortBy) {
		case "newest":
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
		case "oldest":
			return queryRef.orderBy("createdAt", "asc") as typeof queryRef;
		case "popular":
			return queryRef.orderBy("stats.likeCount", "desc") as typeof queryRef;
		case "mostPlayed":
			return queryRef.orderBy("stats.playCount", "desc") as typeof queryRef;
		default:
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
	}
}

type AudioButtonSortBy = "newest" | "oldest" | "popular" | "mostPlayed";

function compareBySortKey(a: AudioButton, b: AudioButton, sortBy: AudioButtonSortBy): number {
	switch (sortBy) {
		case "oldest":
			return a.createdAt.localeCompare(b.createdAt);
		case "popular":
			return (b.stats?.likeCount ?? 0) - (a.stats?.likeCount ?? 0);
		case "mostPlayed":
			return (b.stats?.playCount ?? 0) - (a.stats?.playCount ?? 0);
		default:
			return b.createdAt.localeCompare(a.createdAt);
	}
}

/**
 * in-memory 版の並べ替え（applySorting と同じ並び順）。同値は id 昇順で決定的にする。
 * 入力はキャッシュ共有されうるので破壊せず、新しい配列を返す
 */
export function sortAudioButtons(buttons: AudioButton[], sortBy: AudioButtonSortBy): AudioButton[] {
	return [...buttons].sort(
		(a, b) => compareBySortKey(a, b, sortBy) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
	);
}

/**
 * 検索フィルタを適用
 */
export function filterBySearch(buttons: AudioButton[], search: string): AudioButton[] {
	const searchLower = search.toLowerCase();
	return buttons.filter((button) => button.buttonText.toLowerCase().includes(searchLower));
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
