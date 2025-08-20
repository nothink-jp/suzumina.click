import type { AudioButton, VideoPlainObject } from "@suzumina.click/shared-types";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction } from "@/actions/favorites";
import { auth } from "@/auth";
import { RelatedAudioButtons } from "./RelatedAudioButtons";

interface RelatedAudioButtonsServerProps {
	audioButtons: AudioButton[];
	totalCount: number;
	videoId: string;
	video: VideoPlainObject;
	loading?: boolean;
}

export async function RelatedAudioButtonsServer({
	audioButtons,
	totalCount,
	videoId,
	video,
	loading = false,
}: RelatedAudioButtonsServerProps) {
	// 認証情報を取得
	const session = await auth();
	const userId = session?.user?.discordId;

	// ユーザーがログインしている場合のみ、いいね・低評価・お気に入り状態を一括取得
	let likeDislikeStatuses: Record<string, { isLiked: boolean; isDisliked: boolean }> = {};
	let favoriteStatuses: Record<string, boolean> = {};

	if (userId && audioButtons.length > 0) {
		const audioButtonIds = audioButtons.map((button) => button.id);

		// 並列でステータスを取得
		const [likeDislikeData, favoriteData] = await Promise.all([
			getLikeDislikeStatusAction(audioButtonIds),
			getFavoritesStatusAction(audioButtonIds),
		]);

		// MapをRecordに変換
		likeDislikeStatuses = Object.fromEntries(likeDislikeData);
		favoriteStatuses = Object.fromEntries(favoriteData);
	}

	// Client Componentに状態を渡す
	return (
		<RelatedAudioButtons
			audioButtons={audioButtons}
			totalCount={totalCount}
			videoId={videoId}
			video={video}
			loading={loading}
			initialLikeDislikeStatuses={likeDislikeStatuses}
			initialFavoriteStatuses={favoriteStatuses}
		/>
	);
}
