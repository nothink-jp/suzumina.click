/**
 * コンパクト表示用のタグデータを構築
 */

export interface TagData {
	text: string;
	type: "category" | "playlist" | "user";
	className: string;
}

interface BuildCompactTagsOptions {
	order: "default" | "detail";
	showCategory: boolean;
	categoryId?: string;
	categoryName?: string;
	playlistTags: string[];
	userTags: string[];
	maxTagsPerLayer: number;
}

export function buildCompactTags({
	order,
	showCategory,
	categoryId,
	categoryName,
	playlistTags,
	userTags,
	maxTagsPerLayer,
}: BuildCompactTagsOptions): TagData[] {
	const allTags: TagData[] = [];

	// 1. ジャンル/カテゴリ（両方の順序で優先度1）
	if (showCategory && categoryId && categoryName) {
		allTags.push({
			text: categoryName,
			type: "category",
			className: "bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
		});
	}

	// 2. 配信タイプ（優先度2）
	const displayPlaylistTags =
		maxTagsPerLayer > 0 ? playlistTags.slice(0, maxTagsPerLayer) : playlistTags;

	for (const tag of displayPlaylistTags) {
		allTags.push({
			text: tag,
			type: "playlist",
			className: "bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600",
		});
	}

	// 3. みんなのタグ（優先度3）
	const remainingSpace =
		maxTagsPerLayer > 0 ? Math.max(0, maxTagsPerLayer - allTags.length) : userTags.length;
	const displayUserTags = userTags.slice(0, remainingSpace);

	for (const tag of displayUserTags) {
		allTags.push({
			text: tag,
			type: "user",
			className: "bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100",
		});
	}

	return allTags;
}
