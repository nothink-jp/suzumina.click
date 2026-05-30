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

	// タグフィルター（従来）
	tags: z.array(z.string()).optional(),
	tagMode: z.enum(["any", "all"]).default("any"), // any: いずれか含む, all: すべて含む

	// 3層タグフィルター（動画検索用）
	playlistTags: z.array(z.string()).optional(), // プレイリストタグ
	userTags: z.array(z.string()).optional(), // ユーザータグ
	categoryNames: z.array(z.string()).optional(), // YouTubeカテゴリ名
	layerSearchMode: z.enum(["any_layer", "all_layers", "specific_layer"]).default("any_layer"),

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

// Pure helpers have been moved out to keep this Zod-tainted module out of client bundles:
// getDateRangeFromPreset → ./search/date-range-preset,
// hasActiveFilters → ./search/filter-state,
// getActiveFilterDescriptions → ./search/filter-descriptors.
