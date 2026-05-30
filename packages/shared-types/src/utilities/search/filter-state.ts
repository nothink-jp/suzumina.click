import type { UnifiedSearchFilters } from "../search-filters";

export function hasActiveFilters(filters: UnifiedSearchFilters): boolean {
	return (
		!!filters.dateRange ||
		!!filters.dateFrom ||
		!!filters.dateTo ||
		filters.playCountMin !== undefined ||
		filters.playCountMax !== undefined ||
		filters.likeCountMin !== undefined ||
		filters.likeCountMax !== undefined ||
		filters.favoriteCountMin !== undefined ||
		filters.favoriteCountMax !== undefined ||
		filters.durationMin !== undefined ||
		filters.durationMax !== undefined ||
		(filters.tags?.length ?? 0) > 0 ||
		(filters.playlistTags?.length ?? 0) > 0 ||
		(filters.userTags?.length ?? 0) > 0 ||
		(filters.categoryNames?.length ?? 0) > 0 ||
		filters.sortBy !== "relevance"
	);
}
