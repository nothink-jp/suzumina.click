/**
 * リストコンポーネント用の共通定数
 */

// ページサイズオプション
export const DEFAULT_ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

// ソートオプション
export const BASIC_SORT_OPTIONS = [
	{ value: "newest", label: "新しい順" },
	{ value: "oldest", label: "古い順" },
];

export const WORK_SORT_OPTIONS = [
	...BASIC_SORT_OPTIONS,
	{ value: "popular", label: "人気順" },
	{ value: "price_low", label: "価格が安い順" },
	{ value: "price_high", label: "価格が高い順" },
];

export const WORK_SORT_OPTIONS_WITH_RATING = [
	...WORK_SORT_OPTIONS,
	{ value: "rating", label: "評価が高い順" },
];

export const AUDIO_SORT_OPTIONS = [
	{ value: "newest", label: "新しい順" },
	{ value: "mostPlayed", label: "再生回数順" },
];

export const VIDEO_SORT_OPTIONS = [...BASIC_SORT_OPTIONS];

// グリッドカラム設定
export const GRID_COLUMNS_4 = {
	default: 1,
	sm: 2,
	lg: 3,
	xl: 4,
};

export const GRID_COLUMNS_3 = {
	default: 1,
	md: 2,
	lg: 3,
};

// デフォルト設定
export const DEFAULT_LIST_PROPS = {
	searchable: true,
	urlSync: true,
	defaultSort: "newest",
};
