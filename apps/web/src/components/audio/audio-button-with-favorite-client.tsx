"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { AudioButton } from "@suzumina.click/ui/components/custom/audio-button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getLikeDislikeStatusAction, toggleDislikeAction } from "@/actions/dislikes";
import { toggleFavoriteAction } from "@/actions/favorites";
import { toggleLikeAction } from "@/actions/likes";

interface AudioButtonWithFavoriteClientProps {
	audioButton: AudioButtonPlainObject;
	onPlay?: () => void;
	showFavorite?: boolean;
	className?: string;
	maxTitleLength?: number;
	initialIsFavorited?: boolean;
	initialIsLiked?: boolean;
	initialIsDisliked?: boolean;
	searchQuery?: string;
	highlightClassName?: string;
}

export function AudioButtonWithFavoriteClient({
	audioButton,
	onPlay,
	showFavorite = true,
	className,
	maxTitleLength,
	initialIsFavorited = false,
	initialIsLiked = false,
	initialIsDisliked = false,
	searchQuery,
	highlightClassName,
}: AudioButtonWithFavoriteClientProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
	const [isLiked, setIsLiked] = useState(initialIsLiked);
	const [isDisliked, setIsDisliked] = useState(initialIsDisliked);
	const [likeCount, setLikeCount] = useState(audioButton.stats.likeCount);
	const [dislikeCount, setDislikeCount] = useState(audioButton.stats.dislikeCount || 0);
	const [_isPending, startTransition] = useTransition();
	const isAuthenticated = !!session?.user;

	useEffect(() => {
		// initialIsFavoritedが提供されている場合はそれを使用（一括取得済み）
		setIsFavorited(initialIsFavorited);
		setIsLiked(initialIsLiked);
		setIsDisliked(initialIsDisliked);
	}, [initialIsFavorited, initialIsLiked, initialIsDisliked]);

	// いいね・低評価状態を取得（初期値が提供されていない場合のみ）
	useEffect(() => {
		// initialIsLiked/initialIsDislikedがtrueまたはfalseの場合は、すでにデータが提供されている
		// undefinedの場合のみ個別に取得
		if (isAuthenticated && initialIsLiked === undefined && initialIsDisliked === undefined) {
			getLikeDislikeStatusAction([audioButton.id]).then((statusMap) => {
				const status = statusMap.get(audioButton.id) || { isLiked: false, isDisliked: false };
				setIsLiked(status.isLiked);
				setIsDisliked(status.isDisliked);
			});
		}
	}, [audioButton.id, isAuthenticated, initialIsLiked, initialIsDisliked]);

	const handleFavoriteToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			return;
		}

		startTransition(async () => {
			try {
				const result = await toggleFavoriteAction(audioButton.id);
				if (result.success) {
					setIsFavorited(result.isFavorited ?? false);
					toast.success(
						result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
					);
				} else {
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (_error) {
				toast.error("エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated]);

	// 楽観的UI更新の状態を保存する型
	interface PreviousState {
		isLiked: boolean;
		isDisliked: boolean;
		likeCount: number;
		dislikeCount: number;
	}

	// 楽観的UI更新の状態をロールバックするヘルパー関数
	const rollbackState = useCallback((previousState: PreviousState) => {
		setIsLiked(previousState.isLiked);
		setIsDisliked(previousState.isDisliked);
		setLikeCount(previousState.likeCount);
		setDislikeCount(previousState.dislikeCount);
	}, []);

	// いいねボタンの楽観的UI更新を実行
	const performLikeOptimisticUpdate = useCallback(() => {
		const previousState: PreviousState = {
			isLiked,
			isDisliked,
			likeCount,
			dislikeCount,
		};

		setIsLiked(!isLiked);
		setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

		// 低評価が付いている場合は取り消し
		if (isDisliked) {
			setIsDisliked(false);
			setDislikeCount(Math.max(0, dislikeCount - 1));
		}

		return previousState;
	}, [isLiked, isDisliked, likeCount, dislikeCount]);

	const handleLikeToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("いいねするにはログインが必要です");
			return;
		}

		startTransition(async () => {
			const previousState = performLikeOptimisticUpdate();

			try {
				const result = await toggleLikeAction(audioButton.id);
				if (result.success) {
					setIsLiked(result.isLiked ?? false);
					toast.success(result.isLiked ? "いいねしました" : "いいねを取り消しました");
				} else {
					rollbackState(previousState);
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (_error) {
				rollbackState(previousState);
				toast.error("エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated, performLikeOptimisticUpdate, rollbackState]);

	// 低評価ボタンの楽観的UI更新を実行
	const performDislikeOptimisticUpdate = useCallback(() => {
		const previousState: PreviousState = {
			isLiked,
			isDisliked,
			likeCount,
			dislikeCount,
		};

		setIsDisliked(!isDisliked);
		setDislikeCount(isDisliked ? Math.max(0, dislikeCount - 1) : dislikeCount + 1);

		// いいねが付いている場合は取り消し
		if (isLiked) {
			setIsLiked(false);
			setLikeCount(likeCount - 1);
		}

		return previousState;
	}, [isLiked, isDisliked, likeCount, dislikeCount]);

	const handleDislikeToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("低評価するにはログインが必要です");
			return;
		}

		startTransition(async () => {
			const previousState = performDislikeOptimisticUpdate();

			try {
				const result = await toggleDislikeAction(audioButton.id);
				if (result.success) {
					setIsDisliked(result.isDisliked ?? false);
					toast.success(result.isDisliked ? "低評価しました" : "低評価を取り消しました");
				} else {
					rollbackState(previousState);
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (_error) {
				rollbackState(previousState);
				toast.error("エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated, performDislikeOptimisticUpdate, rollbackState]);

	return (
		<AudioButton
			audioButton={{
				...audioButton,
				stats: {
					...audioButton.stats,
					likeCount: likeCount,
					dislikeCount: dislikeCount,
				},
			}}
			onPlay={onPlay}
			className={className}
			maxTitleLength={maxTitleLength}
			showDetailLink={true}
			onDetailClick={() => router.push(`/buttons/${audioButton.id}`)}
			isFavorite={isFavorited}
			onFavoriteToggle={showFavorite ? handleFavoriteToggle : undefined}
			isLiked={isLiked}
			onLikeToggle={handleLikeToggle}
			isDisliked={isDisliked}
			onDislikeToggle={handleDislikeToggle}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
			isAuthenticated={isAuthenticated}
		/>
	);
}
