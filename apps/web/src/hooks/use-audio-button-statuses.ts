"use client";

import { useCallback, useEffect, useState } from "react";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction } from "@/actions/favorites";

interface LikeDislikeStatus {
	isLiked: boolean;
	isDisliked: boolean;
}

interface AudioButtonStatuses {
	likeDislikeStatuses: Record<string, LikeDislikeStatus>;
	favoriteStatuses: Record<string, boolean>;
	isLoading: boolean;
}

/**
 * 音声ボタンのいいね・低評価・お気に入り状態をクライアントサイドで取得するフック
 * LCP改善のため、初期レンダリング後に非同期で取得する
 */
export function useAudioButtonStatuses(audioButtonIds: string[]): AudioButtonStatuses {
	const [likeDislikeStatuses, setLikeDislikeStatuses] = useState<Record<string, LikeDislikeStatus>>(
		{},
	);
	const [favoriteStatuses, setFavoriteStatuses] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(true);

	const fetchStatuses = useCallback(async () => {
		if (audioButtonIds.length === 0) {
			setIsLoading(false);
			return;
		}

		try {
			const [likeDislikeData, favoriteData] = await Promise.all([
				getLikeDislikeStatusAction(audioButtonIds),
				getFavoritesStatusAction(audioButtonIds),
			]);

			setLikeDislikeStatuses(Object.fromEntries(likeDislikeData));
			setFavoriteStatuses(Object.fromEntries(favoriteData));
		} catch {
			// エラー時は空のままにする（デフォルト値が使われる）
		} finally {
			setIsLoading(false);
		}
	}, [audioButtonIds]);

	useEffect(() => {
		fetchStatuses();
	}, [fetchStatuses]);

	return {
		likeDislikeStatuses,
		favoriteStatuses,
		isLoading,
	};
}
