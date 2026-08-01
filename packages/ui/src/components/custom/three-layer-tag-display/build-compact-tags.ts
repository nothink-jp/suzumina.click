/**
 * コンパクト表示用のタグデータを構築
 */

export interface TagData {
	text: string;
	type: "category" | "playlist";
	className: string;
}

interface BuildCompactTagsOptions {
	showCategory: boolean;
	categoryId?: string;
	categoryName?: string;
	playlistTags: string[];
	maxTagsPerLayer: number;
}

export function buildCompactTags({
	showCategory,
	categoryId,
	categoryName,
	playlistTags,
	maxTagsPerLayer,
}: BuildCompactTagsOptions): TagData[] {
	const allTags: TagData[] = [];

	// 1. ジャンル/カテゴリ（両方の順序で優先度1）
	if (showCategory && categoryId && categoryName) {
		allTags.push({
			text: categoryName,
			type: "category",
			className: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
		});
	}

	// 2. 配信タイプ（優先度2）
	const displayPlaylistTags =
		maxTagsPerLayer > 0 ? playlistTags.slice(0, maxTagsPerLayer) : playlistTags;

	for (const tag of displayPlaylistTags) {
		allTags.push({
			text: tag,
			type: "playlist",
			className: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
		});
	}

	return allTags;
}
