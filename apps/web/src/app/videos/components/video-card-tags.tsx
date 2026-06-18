"use client";

import { VideoTagDisplay } from "@suzumina.click/ui/components/custom/three-layer-tag-display";
import { buildTagSearchHref } from "@/lib/tag-search";

interface VideoCardTagsProps {
	playlistTags: string[];
	userTags: string[];
	categoryId?: string;
	categoryName?: string;
	searchQuery?: string;
}

/**
 * VideoCard のタグ表示 island（client）。
 * 純関数 {@link buildTagSearchHref} を VideoTagDisplay（client）へ渡す DI は client 境界内でのみ成立する。
 * server shell の VideoCard から直接関数を渡すと RSC で
 * "Functions cannot be passed directly to Client Components" になるため、ここに隔離する。
 */
export function VideoCardTags({
	playlistTags,
	userTags,
	categoryId,
	categoryName,
	searchQuery,
}: VideoCardTagsProps) {
	return (
		<VideoTagDisplay
			playlistTags={playlistTags}
			userTags={userTags}
			categoryId={categoryId}
			categoryName={categoryName}
			size="sm"
			maxTagsPerLayer={5}
			showEmptyLayers={false}
			showCategory={true}
			compact={true}
			tagHref={buildTagSearchHref}
			searchQuery={searchQuery}
		/>
	);
}
