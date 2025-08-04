"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";

/**
 * 複数の音声ボタンのいいね・低評価状態を一括で取得するフック
 */
export function useLikeDislikeStatusBulk(audioButtonIds: string[]) {
	const { data: session } = useSession();
	const [likeDislikeStates, setLikeDislikeStates] = useState<
		Map<string, { isLiked: boolean; isDisliked: boolean }>
	>(new Map());
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		// ユーザーがログインしていない場合は何もしない
		if (!session?.user || audioButtonIds.length === 0) {
			setLikeDislikeStates(new Map());
			return;
		}

		setIsLoading(true);

		// いいね・低評価状態を一括で取得
		getLikeDislikeStatusAction(audioButtonIds)
			.then((statusMap) => {
				setLikeDislikeStates(statusMap);
			})
			.catch((_error) => {
				setLikeDislikeStates(new Map());
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [session?.user, audioButtonIds]); // audioButtonIdsの内容が変わったら再取得

	return { likeDislikeStates, isLoading };
}
