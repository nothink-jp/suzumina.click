import { z } from "zod";

/**
 * 日付範囲プリセット
 */
export const DateRangePresetSchema = z.enum([
	"today", // 今日
	"this_week", // 今週
	"this_month", // 今月
	"last_30_days", // 過去30日
	"custom", // カスタム範囲
]);

/**
 * 統合検索フィルター
 */
export const UnifiedSearchFiltersSchema = z.object({
	// 基本検索
	query: z.string().optional(),
	type: z.enum(["all", "buttons", "videos", "works"]).default("all"),
	limit: z.number().int().positive().max(50).default(12),

	// 日付範囲フィルター
	dateRange: DateRangePresetSchema.optional(),
	dateFrom: z.string().datetime().optional(), // カスタム開始日
	dateTo: z.string().datetime().optional(), // カスタム終了日

	// 数値範囲フィルター（音声ボタン用）
	playCountMin: z.number().int().min(0).optional(),
	playCountMax: z.number().int().min(0).optional(),
	likeCountMin: z.number().int().min(0).optional(),
	likeCountMax: z.number().int().min(0).optional(),
	favoriteCountMin: z.number().int().min(0).optional(),
	favoriteCountMax: z.number().int().min(0).optional(),
	durationMin: z.number().int().min(0).optional(), // 秒単位
	durationMax: z.number().int().min(0).optional(), // 秒単位

	// タグフィルター
	tags: z.array(z.string()).optional(),
	tagMode: z.enum(["any", "all"]).default("any"), // any: いずれか含む, all: すべて含む

	// レーティング・年齢制限フィルター（作品用）
	ageRating: z.array(z.string()).optional(), // ["全年齢", "R18"] 等
	excludeR18: z.boolean().optional(), // R18作品を除外

	// ソート
	sortBy: z.enum(["relevance", "newest", "oldest", "popular", "mostPlayed"]).default("relevance"),
});

/**
 * フィルター適用状態
 */
export const FilterStateSchema = z.object({
	isActive: z.boolean(),
	activeFilters: z.array(z.string()), // アクティブなフィルターのリスト
});

// 型定義
export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;
export type UnifiedSearchFilters = z.infer<typeof UnifiedSearchFiltersSchema>;
export type FilterState = z.infer<typeof FilterStateSchema>;

/**
 * 日付範囲プリセットから実際の日付範囲を計算
 */
export function getDateRangeFromPreset(preset: DateRangePreset): {
	from: Date;
	to: Date;
} {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	switch (preset) {
		case "today":
			return {
				from: today,
				to: new Date(today.getTime() + 24 * 60 * 60 * 1000),
			};

		case "this_week": {
			const dayOfWeek = today.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const weekStart = new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
			return {
				from: weekStart,
				to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
			};
		}

		case "this_month": {
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			return {
				from: monthStart,
				to: monthEnd,
			};
		}

		case "last_30_days": {
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			return {
				from: thirtyDaysAgo,
				to: now,
			};
		}

		case "custom":
			// カスタムの場合は呼び出し側で日付を指定
			return {
				from: today,
				to: now,
			};
	}
}

/**
 * フィルターが適用されているかチェック
 */
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
		filters.sortBy !== "relevance"
	);
}

/**
 * 日付範囲フィルターの説明を生成
 */
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

/**
 * 数値範囲フィルターの説明を生成
 */
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

/**
 * タグフィルターの説明を生成
 */
function getTagDescription(filters: UnifiedSearchFilters): string | null {
	if (filters.tags && filters.tags.length > 0) {
		const mode = filters.tagMode === "all" ? "すべて含む" : "いずれか含む";
		return `タグ(${mode}): ${filters.tags.join(", ")}`;
	}
	return null;
}

/**
 * ソートフィルターの説明を生成
 */
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

/**
 * アクティブなフィルターの説明を生成
 */
export function getActiveFilterDescriptions(filters: UnifiedSearchFilters): string[] {
	const descriptions: string[] = [];

	// 各フィルター描述を取得して追加
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

	const sort = getSortDescription(filters);
	if (sort) descriptions.push(sort);

	return descriptions;
}
