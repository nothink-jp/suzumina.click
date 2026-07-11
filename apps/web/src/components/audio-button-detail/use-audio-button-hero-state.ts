"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction, toggleFavoriteAction } from "@/actions/favorites";
import { toggleLikeAction } from "@/actions/likes";
import { usePlayCount } from "@/hooks/use-play-count";
import { useSession } from "@/lib/auth/client";

/**
 * 詳細ページヒーローの状態管理（SPR-255）。
 * - 再生: usePlayCount で計上し、表示上は楽観的に +1（「N 回目の再生中…」）
 * - お気に入り/高評価: SSR に焼かず、認証済みなら client で自己取得（純公開 shell・SPR-223）。
 *   トグルは favorite-button.tsx / like-dislike-buttons.tsx と同じ楽観的更新 + ロールバック
 */
export function useAudioButtonHeroState(audioButton: AudioButtonPlainObject) {
	const router = useRouter();
	const user = useSession();
	const isAuthenticated = !!user;

	// 再生状態と楽観的再生回数
	const { handlePlay, cleanup } = usePlayCount();
	const [isPlaying, setIsPlaying] = useState(false);
	const [playBump, setPlayBump] = useState(0);
	useEffect(() => cleanup, [cleanup]);

	const handlePlayStart = useCallback(() => {
		handlePlay(audioButton.id);
		setPlayBump((n) => n + 1);
	}, [handlePlay, audioButton.id]);

	// お気に入り / 高評価（client 自己解決）
	const [isFavorited, setIsFavorited] = useState(false);
	const [isLiked, setIsLiked] = useState(false);
	const [likeCount, setLikeCount] = useState(audioButton.stats.likeCount);

	useEffect(() => {
		if (!isAuthenticated) return;
		let cancelled = false;
		void getFavoritesStatusAction([audioButton.id]).then((statusMap) => {
			if (!cancelled) setIsFavorited(statusMap.get(audioButton.id) ?? false);
		});
		void getLikeDislikeStatusAction([audioButton.id]).then((statusMap) => {
			if (!cancelled) setIsLiked(statusMap.get(audioButton.id)?.isLiked ?? false);
		});
		return () => {
			cancelled = true;
		};
	}, [audioButton.id, isAuthenticated]);

	const toggleFavorite = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			router.push("/auth/signin");
			return;
		}
		const previous = isFavorited;
		setIsFavorited(!previous);
		void toggleFavoriteAction(audioButton.id).then((result) => {
			if (result.success && result.isFavorited !== undefined) {
				setIsFavorited(result.isFavorited);
				toast.success(
					result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
				);
			} else {
				setIsFavorited(previous);
				toast.error(result.error || "エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated, isFavorited, router]);

	const toggleLike = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("高評価するにはログインが必要です");
			return;
		}
		const previous = { isLiked, likeCount };
		setIsLiked(!previous.isLiked);
		setLikeCount(previous.likeCount + (previous.isLiked ? -1 : 1));
		void toggleLikeAction(audioButton.id).then((result) => {
			if (result.success && result.isLiked !== undefined) {
				setIsLiked(result.isLiked);
				toast.success(result.isLiked ? "高評価しました" : "高評価を取り消しました");
			} else {
				setIsLiked(previous.isLiked);
				setLikeCount(previous.likeCount);
				toast.error(result.error || "エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated, isLiked, likeCount]);

	return {
		isPlaying,
		playCount: audioButton.stats.playCount + playBump,
		handlePlayStart,
		handlePlayStateChange: setIsPlaying,
		isFavorited,
		toggleFavorite,
		isLiked,
		likeCount,
		toggleLike,
	};
}
