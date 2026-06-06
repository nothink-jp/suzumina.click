import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { AudioButtonWithPlayCount } from "./audio-button-with-play-count";

interface AudioButtonListItemProps {
	audioButton: AudioButtonPlainObject;
	searchQuery?: string;
	isFavorited: boolean;
	isLiked: boolean;
	isDisliked: boolean;
}

/**
 * リスト内での音声ボタン表示用コンポーネント
 * AudioButtonsListとFavoritesListで共通使用
 */
export function AudioButtonListItem({
	audioButton,
	searchQuery,
	isFavorited,
	isLiked,
	isDisliked,
}: AudioButtonListItemProps) {
	return (
		<AudioButtonWithPlayCount
			audioButton={audioButton}
			className="shadow-sm hover:shadow-md transition-all duration-200"
			searchQuery={searchQuery}
			highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
			initialIsFavorited={isFavorited}
			initialIsLiked={isLiked}
			initialIsDisliked={isDisliked}
		/>
	);
}
