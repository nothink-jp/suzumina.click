import { FavoriteButton } from "@/components/audio/favorite-button";
import { LikeDislikeButtons } from "@/components/audio/like-dislike-buttons";

interface AudioButtonDetailActionsProps {
	audioButtonId: string;
	favoriteCount: number;
	likeCount: number;
}

export function AudioButtonDetailActions({
	audioButtonId,
	favoriteCount,
	likeCount,
}: AudioButtonDetailActionsProps) {
	// per-user 状態（お気に入り/高低評価）は SSR に焼かず、各 leaf が client で自己解決する
	// （純公開 shell・SPR-223）。ここで渡すのは公開データ（件数）のみ。
	return (
		<div className="mb-6">
			<div className="flex gap-2 flex-wrap">
				{/* お気に入りボタン */}
				<FavoriteButton
					audioButtonId={audioButtonId}
					favoriteCount={favoriteCount}
					showCount={false}
					size="sm"
					className="flex items-center gap-1"
				/>

				{/* 高評価・低評価ボタングループ */}
				<LikeDislikeButtons
					audioButtonId={audioButtonId}
					initialLikeCount={likeCount}
					variant="outline"
					size="sm"
				/>
			</div>
		</div>
	);
}
