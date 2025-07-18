import { FavoriteButton } from "@/components/audio/favorite-button";
import { LikeDislikeButtons } from "@/components/audio/like-dislike-buttons";

interface AudioButtonDetailActionsProps {
	audioButtonId: string;
	isFavorited: boolean;
	favoriteCount: number;
	likeCount: number;
	isLiked: boolean;
	isDisliked: boolean;
	isAuthenticated: boolean;
}

export function AudioButtonDetailActions({
	audioButtonId,
	isFavorited,
	favoriteCount,
	likeCount,
	isLiked,
	isDisliked,
	isAuthenticated,
}: AudioButtonDetailActionsProps) {
	return (
		<div className="mb-6">
			<div className="flex gap-2 flex-wrap">
				{/* お気に入りボタン */}
				<FavoriteButton
					audioButtonId={audioButtonId}
					isFavorited={isFavorited}
					favoriteCount={favoriteCount}
					showCount={false}
					size="sm"
					className="flex items-center gap-1"
					isAuthenticated={isAuthenticated}
				/>

				{/* 高評価・低評価ボタングループ */}
				<LikeDislikeButtons
					audioButtonId={audioButtonId}
					initialLikeCount={likeCount}
					initialIsLiked={isLiked}
					initialIsDisliked={isDisliked}
					variant="outline"
					size="sm"
				/>
			</div>
		</div>
	);
}
