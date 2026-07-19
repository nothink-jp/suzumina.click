"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction, toggleFavoriteAction } from "@/actions/favorites";
import { toggleLikeAction } from "@/actions/likes";
import { trackFavoriteToggle } from "@/lib/analytics/events";
import { useSession } from "@/lib/auth/client";

/**
 * お気に入り/高評価の per-user 状態の正本（SPR-257 で一覧・詳細/モーダルの二重実装を統合）。
 * - SSR に焼かず client で解決する（純公開 shell 原則・SPR-223）
 * - 初期値が渡されたらそれを使う（一覧の一括取得経路）。undefined なら認証時に自己取得
 * - トグルは楽観的更新 + 失敗時ロールバック + toast。未ログインは toast のみ（リダイレクトしない）
 * - 低評価はデータ/action を温存したまま UI 経路を持たない（製品判断）
 */

interface UseAudioButtonEngagementOptions {
	/** 一覧の一括取得済み初期値。undefined なら self-fetch する */
	initialIsFavorited?: boolean;
	initialIsLiked?: boolean;
}

export function useAudioButtonEngagement(
	audioButton: AudioButtonPlainObject,
	{ initialIsFavorited, initialIsLiked }: UseAudioButtonEngagementOptions = {},
) {
	const user = useSession();
	const isAuthenticated = !!user;

	const [isFavorited, setIsFavorited] = useState(initialIsFavorited ?? false);
	const [isLiked, setIsLiked] = useState(initialIsLiked ?? false);
	const [likeCount, setLikeCount] = useState(audioButton.stats.likeCount);

	// 一括取得済み初期値の反映（一覧の再レンダーで初期値が更新されるケース）
	useEffect(() => {
		if (initialIsFavorited !== undefined) setIsFavorited(initialIsFavorited);
	}, [initialIsFavorited]);
	useEffect(() => {
		if (initialIsLiked !== undefined) setIsLiked(initialIsLiked);
	}, [initialIsLiked]);

	// 初期値が無い場合のみ self-fetch（詳細ページ・モーダル経路）
	useEffect(() => {
		if (!isAuthenticated) return;
		if (initialIsFavorited !== undefined && initialIsLiked !== undefined) return;
		let cancelled = false;
		if (initialIsFavorited === undefined) {
			void getFavoritesStatusAction([audioButton.id]).then((statusMap) => {
				if (!cancelled) setIsFavorited(statusMap.get(audioButton.id) ?? false);
			});
		}
		if (initialIsLiked === undefined) {
			void getLikeDislikeStatusAction([audioButton.id]).then((statusMap) => {
				if (!cancelled) setIsLiked(statusMap.get(audioButton.id)?.isLiked ?? false);
			});
		}
		return () => {
			cancelled = true;
		};
	}, [audioButton.id, isAuthenticated, initialIsFavorited, initialIsLiked]);

	const toggleFavorite = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			return;
		}
		const previous = isFavorited;
		setIsFavorited(!previous);
		void toggleFavoriteAction(audioButton.id)
			.then((result) => {
				if (result.success && result.isFavorited !== undefined) {
					setIsFavorited(result.isFavorited);
					trackFavoriteToggle(audioButton.id, result.isFavorited);
					toast.success(
						result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
					);
				} else {
					setIsFavorited(previous);
					toast.error(result.error || "エラーが発生しました");
				}
			})
			.catch(() => {
				setIsFavorited(previous);
				toast.error("エラーが発生しました");
			});
	}, [audioButton.id, isAuthenticated, isFavorited]);

	const toggleLike = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("高評価するにはログインが必要です");
			return;
		}
		const previous = { isLiked, likeCount };
		setIsLiked(!previous.isLiked);
		setLikeCount(previous.likeCount + (previous.isLiked ? -1 : 1));
		const rollback = () => {
			setIsLiked(previous.isLiked);
			setLikeCount(previous.likeCount);
		};
		void toggleLikeAction(audioButton.id)
			.then((result) => {
				if (result.success && result.isLiked !== undefined) {
					setIsLiked(result.isLiked);
					toast.success(result.isLiked ? "高評価しました" : "高評価を取り消しました");
				} else {
					rollback();
					toast.error(result.error || "エラーが発生しました");
				}
			})
			.catch(() => {
				rollback();
				toast.error("エラーが発生しました");
			});
	}, [audioButton.id, isAuthenticated, isLiked, likeCount]);

	return { isAuthenticated, isFavorited, toggleFavorite, isLiked, likeCount, toggleLike };
}
