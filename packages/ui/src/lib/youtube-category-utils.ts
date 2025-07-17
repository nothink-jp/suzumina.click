/**
 * YouTube カテゴリID関連のユーティリティ関数
 * VIDEO_TAGS_DESIGN.md準拠
 */

/**
 * YouTubeカテゴリIDと日本語名の対応表
 */
const YOUTUBE_CATEGORIES = {
	"1": "映画・アニメ",
	"2": "自動車・乗り物",
	"10": "音楽",
	"15": "ペット・動物",
	"17": "スポーツ",
	"19": "旅行・イベント",
	"20": "ゲーム",
	"22": "ブログ・人物",
	"23": "コメディー",
	"24": "エンターテインメント",
	"25": "ニュース・政治",
	"26": "ハウツー・スタイル",
	"27": "教育",
	"28": "科学技術",
	"29": "非営利団体・社会活動",
} as const;

/**
 * YouTubeカテゴリIDを日本語名に変換する
 *
 * @param categoryId - YouTubeカテゴリID
 * @returns 日本語カテゴリ名、または未対応カテゴリの場合は`カテゴリ${categoryId}`
 */
export function getYouTubeCategoryName(categoryId?: string): string | null {
	if (!categoryId) return null;

	return (
		YOUTUBE_CATEGORIES[categoryId as keyof typeof YOUTUBE_CATEGORIES] || `カテゴリ${categoryId}`
	);
}

/**
 * サポートされているYouTubeカテゴリIDの一覧を取得
 *
 * @returns サポートされているカテゴリIDの配列
 */
export function getSupportedCategoryIds(): string[] {
	return Object.keys(YOUTUBE_CATEGORIES);
}

/**
 * YouTubeカテゴリIDが有効かどうかを判定
 *
 * @param categoryId - 判定するカテゴリID
 * @returns 有効なカテゴリIDの場合true
 */
export function isValidCategoryId(categoryId: string): boolean {
	return categoryId in YOUTUBE_CATEGORIES;
}
