import type { DateRangePreset, UnifiedSearchFilters } from "../search-filters";

function getDateRangeDescription(filters: UnifiedSearchFilters): string | null {
	if (filters.dateRange && filters.dateRange !== "custom") {
		const labels: Record<DateRangePreset, string> = {
			today: "今日",
			this_week: "今週",
			this_month: "今月",
			last_30_days: "過去30日",
			custom: "カスタム",
		};
		return `期間: ${labels[filters.dateRange]}`;
	}
	if (filters.dateFrom || filters.dateTo) {
		return "期間: カスタム範囲";
	}
	return null;
}

function getRangeDescription(
	min: number | undefined,
	max: number | undefined,
	label: string,
	unit = "",
): string | null {
	if (min !== undefined || max !== undefined) {
		if (min !== undefined && max !== undefined) {
			return `${label}: ${min}〜${max}${unit}`;
		}
		if (min !== undefined) {
			return `${label}: ${min}${unit}以上`;
		}
		return `${label}: ${max}${unit}以下`;
	}
	return null;
}

function getTagDescription(filters: UnifiedSearchFilters): string | null {
	if (filters.tags && filters.tags.length > 0) {
		const mode = filters.tagMode === "all" ? "すべて含む" : "いずれか含む";
		return `タグ(${mode}): ${filters.tags.join(", ")}`;
	}
	return null;
}

function getThreeLayerTagDescription(filters: UnifiedSearchFilters): string[] {
	const descriptions: string[] = [];

	if (filters.playlistTags && filters.playlistTags.length > 0) {
		descriptions.push(`プレイリスト: ${filters.playlistTags.join(", ")}`);
	}

	if (filters.userTags && filters.userTags.length > 0) {
		descriptions.push(`ユーザータグ: ${filters.userTags.join(", ")}`);
	}

	if (filters.categoryNames && filters.categoryNames.length > 0) {
		descriptions.push(`カテゴリ: ${filters.categoryNames.join(", ")}`);
	}

	return descriptions;
}

function getSortDescription(filters: UnifiedSearchFilters): string | null {
	if (filters.sortBy !== "relevance") {
		const sortLabels: Record<UnifiedSearchFilters["sortBy"], string> = {
			relevance: "関連度順",
			newest: "新しい順",
			oldest: "古い順",
			popular: "人気順",
			mostPlayed: "再生数順",
		};
		return `並び順: ${sortLabels[filters.sortBy]}`;
	}
	return null;
}

export function getActiveFilterDescriptions(filters: UnifiedSearchFilters): string[] {
	const descriptions: string[] = [];

	const dateRange = getDateRangeDescription(filters);
	if (dateRange) descriptions.push(dateRange);

	const playCount = getRangeDescription(filters.playCountMin, filters.playCountMax, "再生数", "回");
	if (playCount) descriptions.push(playCount);

	const likeCount = getRangeDescription(filters.likeCountMin, filters.likeCountMax, "いいね");
	if (likeCount) descriptions.push(likeCount);

	const favoriteCount = getRangeDescription(
		filters.favoriteCountMin,
		filters.favoriteCountMax,
		"お気に入り",
	);
	if (favoriteCount) descriptions.push(favoriteCount);

	const duration = getRangeDescription(filters.durationMin, filters.durationMax, "長さ", "秒");
	if (duration) descriptions.push(duration);

	const tag = getTagDescription(filters);
	if (tag) descriptions.push(tag);

	const threeLayerTags = getThreeLayerTagDescription(filters);
	descriptions.push(...threeLayerTags);

	const sort = getSortDescription(filters);
	if (sort) descriptions.push(sort);

	return descriptions;
}
