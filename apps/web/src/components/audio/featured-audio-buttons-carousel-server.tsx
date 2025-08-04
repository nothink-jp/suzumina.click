import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction } from "@/actions/favorites";
import { auth } from "@/auth";
import { FeaturedAudioButtonsCarousel } from "./featured-audio-buttons-carousel";

interface FeaturedAudioButtonsCarouselServerProps {
	audioButtons: AudioButtonPlainObject[];
}

export async function FeaturedAudioButtonsCarouselServer({
	audioButtons,
}: FeaturedAudioButtonsCarouselServerProps) {
	// 認証情報を取得
	const session = await auth();
	const userId = session?.user?.discordId;

	// ユーザーがログインしている場合のみ、いいね・低評価・お気に入り状態を一括取得
	const likeDislikeStatuses: Record<string, { isLiked: boolean; isDisliked: boolean }> = {};
	const favoriteStatuses: Record<string, boolean> = {};

	if (userId && audioButtons.length > 0) {
		const audioButtonIds = audioButtons.map((button) => button.id);

		// 並列でステータスを取得
		const [likeDislikeData, favoriteData] = await Promise.all([
			getLikeDislikeStatusAction(audioButtonIds),
			getFavoritesStatusAction(audioButtonIds),
		]);

		// MapをRecordに変換（Object.fromEntriesを使用して効率化）
		Object.assign(likeDislikeStatuses, Object.fromEntries(likeDislikeData));
		Object.assign(favoriteStatuses, Object.fromEntries(favoriteData));
	}

	// Client Componentに状態を渡す
	return (
		<FeaturedAudioButtonsCarousel
			audioButtons={audioButtons}
			initialLikeDislikeStatuses={likeDislikeStatuses}
			initialFavoriteStatuses={favoriteStatuses}
		/>
	);
}
