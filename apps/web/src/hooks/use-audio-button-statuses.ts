"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

	// 配列の内容に基づく安定したキャッシュキーを生成
	const cacheKey = useMemo(() => [...audioButtonIds].sort().join(","), [audioButtonIds]);

	// 前回のキャッシュキーを保持して不要なフェッチを防ぐ
	const previousCacheKeyRef = useRef<string>("");

	// アンマウント時のクリーンアップ用フラグ
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;

		// キャッシュキーが変わっていない場合はスキップ
		if (cacheKey === previousCacheKeyRef.current) {
			return;
		}
		previousCacheKeyRef.current = cacheKey;

		if (cacheKey === "") {
			setIsLoading(false);
			return;
		}

		const fetchStatuses = async () => {
			try {
				// cacheKey からIDリストを復元（ソート済み）
				const ids = cacheKey.split(",");
				const [likeDislikeData, favoriteData] = await Promise.all([
					getLikeDislikeStatusAction(ids),
					getFavoritesStatusAction(ids),
				]);

				// アンマウント後はステート更新しない
				if (!isMountedRef.current) return;

				setLikeDislikeStatuses(Object.fromEntries(likeDislikeData));
				setFavoriteStatuses(Object.fromEntries(favoriteData));
			} catch {
				// エラー時は空のままにする（デフォルト値が使われる）
			} finally {
				if (isMountedRef.current) {
					setIsLoading(false);
				}
			}
		};

		fetchStatuses();

		return () => {
			isMountedRef.current = false;
		};
	}, [cacheKey]);

	return {
		likeDislikeStatuses,
		favoriteStatuses,
		isLoading,
	};
}
