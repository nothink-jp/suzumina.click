"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getLikeDislikeStatusAction, toggleDislikeAction } from "@/actions/dislikes";
import { toggleLikeAction } from "@/actions/likes";

interface LikeDislikeButtonsProps {
	audioButtonId: string;
	initialLikeCount: number;
	initialIsLiked?: boolean;
	initialIsDisliked?: boolean;
	variant?: "default" | "ghost" | "outline" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function LikeDislikeButtons({
	audioButtonId,
	initialLikeCount,
	initialIsLiked = false,
	initialIsDisliked = false,
	variant = "outline",
	size = "sm",
	className,
}: LikeDislikeButtonsProps) {
	const { data: session } = useSession();
	const [isLiked, setIsLiked] = useState(initialIsLiked);
	const [isDisliked, setIsDisliked] = useState(initialIsDisliked);
	const [likeCount, setLikeCount] = useState(initialLikeCount);
	const [isPending, startTransition] = useTransition();
	const isAuthenticated = !!session?.user;

	// ユーザーの高評価・低評価状態を取得
	useEffect(() => {
		if (isAuthenticated && !initialIsLiked && !initialIsDisliked) {
			getLikeDislikeStatusAction([audioButtonId]).then((statusMap) => {
				const status = statusMap.get(audioButtonId) || { isLiked: false, isDisliked: false };
				setIsLiked(status.isLiked);
				setIsDisliked(status.isDisliked);
			});
		}
	}, [audioButtonId, isAuthenticated, initialIsLiked, initialIsDisliked]);

	const performLikeToggle = useCallback(async () => {
		const previousIsLiked = isLiked;
		const previousIsDisliked = isDisliked;
		const previousLikeCount = likeCount;

		// 楽観的UI更新
		setIsLiked(!isLiked);
		setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

		// 低評価が付いている場合は取り消し
		if (isDisliked) {
			setIsDisliked(false);
		}

		try {
			const result = await toggleLikeAction(audioButtonId);

			if (result.success) {
				toast.success(result.isLiked ? "いいねしました" : "いいねを取り消しました");
				if (result.isLiked !== undefined) {
					setIsLiked(result.isLiked);
				}
			} else {
				// エラー時は楽観的更新をロールバック
				setIsLiked(previousIsLiked);
				setIsDisliked(previousIsDisliked);
				setLikeCount(previousLikeCount);
				toast.error(result.error || "エラーが発生しました");
			}
		} catch (_error) {
			// エラー時は楽観的更新をロールバック
			setIsLiked(previousIsLiked);
			setIsDisliked(previousIsDisliked);
			setLikeCount(previousLikeCount);
			toast.error("エラーが発生しました");
		}
	}, [audioButtonId, isLiked, isDisliked, likeCount]);

	const performDislikeToggle = useCallback(async () => {
		const previousIsLiked = isLiked;
		const previousIsDisliked = isDisliked;
		const previousLikeCount = likeCount;

		// 楽観的UI更新
		setIsDisliked(!isDisliked);

		// いいねが付いている場合は取り消し
		if (isLiked) {
			setIsLiked(false);
			setLikeCount(likeCount - 1);
		}

		try {
			const result = await toggleDislikeAction(audioButtonId);

			if (result.success) {
				toast.success(result.isDisliked ? "低評価しました" : "低評価を取り消しました");
				if (result.isDisliked !== undefined) {
					setIsDisliked(result.isDisliked);
				}
			} else {
				// エラー時は楽観的更新をロールバック
				setIsLiked(previousIsLiked);
				setIsDisliked(previousIsDisliked);
				setLikeCount(previousLikeCount);
				toast.error(result.error || "エラーが発生しました");
			}
		} catch (_error) {
			// エラー時は楽観的更新をロールバック
			setIsLiked(previousIsLiked);
			setIsDisliked(previousIsDisliked);
			setLikeCount(previousLikeCount);
			toast.error("エラーが発生しました");
		}
	}, [audioButtonId, isLiked, isDisliked, likeCount]);

	const handleLikeToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("いいねするにはログインが必要です");
			return;
		}

		startTransition(() => {
			performLikeToggle();
		});
	}, [isAuthenticated, performLikeToggle]);

	const handleDislikeToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("低評価するにはログインが必要です");
			return;
		}

		startTransition(() => {
			performDislikeToggle();
		});
	}, [isAuthenticated, performDislikeToggle]);

	return (
		<div className={`flex rounded-md border border-input ${className || ""}`}>
			{/* 高評価ボタン */}
			<Button
				variant={variant}
				size={size}
				onClick={handleLikeToggle}
				disabled={isPending || !isAuthenticated}
				className={`flex items-center gap-1 border-0 rounded-l-md rounded-r-none border-r border-input ${
					isLiked ? "text-red-600 hover:text-red-700" : "text-muted-foreground hover:text-red-600"
				}`}
				title={
					!isAuthenticated
						? "いいねするにはログインが必要です"
						: isLiked
							? "いいねを取り消す"
							: "いいねする"
				}
			>
				<ThumbsUp
					className={`h-4 w-4 ${isLiked ? "fill-current" : ""} ${isPending ? "animate-pulse" : ""}`}
				/>
				<span className="text-sm font-medium">{likeCount.toLocaleString()}</span>
			</Button>

			{/* 低評価ボタン（YouTube方式：集計数は非表示） */}
			<Button
				variant={variant}
				size={size}
				onClick={handleDislikeToggle}
				disabled={isPending || !isAuthenticated}
				className={`flex items-center justify-center border-0 rounded-r-md rounded-l-none ${
					isDisliked
						? "text-blue-600 hover:text-blue-700"
						: "text-muted-foreground hover:text-blue-600"
				}`}
				title={
					!isAuthenticated
						? "低評価するにはログインが必要です"
						: isDisliked
							? "低評価を取り消す"
							: "低評価する"
				}
			>
				<ThumbsDown
					className={`h-4 w-4 ${isDisliked ? "fill-current" : ""} ${isPending ? "animate-pulse" : ""}`}
				/>
				{/* YouTube方式: 低評価数は表示しない */}
			</Button>
		</div>
	);
}
