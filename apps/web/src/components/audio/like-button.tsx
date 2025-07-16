"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { toggleLikeAction } from "@/actions/likes";

interface LikeButtonProps {
	audioButtonId: string;
	initialLikeCount: number;
	initialIsLiked?: boolean;
	variant?: "default" | "ghost" | "outline" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function LikeButton({
	audioButtonId,
	initialLikeCount,
	initialIsLiked = false,
	variant = "ghost",
	size = "sm",
	className,
}: LikeButtonProps) {
	const { data: session } = useSession();
	const [isLiked, setIsLiked] = useState(initialIsLiked);
	const [likeCount, setLikeCount] = useState(initialLikeCount);
	const [isPending, startTransition] = useTransition();
	const isAuthenticated = !!session?.user;

	// ユーザーの高評価・低評価状態を取得
	useEffect(() => {
		if (isAuthenticated && !initialIsLiked) {
			getLikeDislikeStatusAction([audioButtonId]).then((statusMap) => {
				const status = statusMap.get(audioButtonId) || { isLiked: false, isDisliked: false };
				setIsLiked(status.isLiked);
			});
		}
	}, [audioButtonId, isAuthenticated, initialIsLiked]);

	const performLikeToggle = useCallback(async () => {
		const previousIsLiked = isLiked;
		const previousLikeCount = likeCount;

		// 楽観的UI更新
		setIsLiked(!isLiked);
		setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

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
				setLikeCount(previousLikeCount);
				toast.error(result.error || "エラーが発生しました");
			}
		} catch (_error) {
			// エラー時は楽観的更新をロールバック
			setIsLiked(previousIsLiked);
			setLikeCount(previousLikeCount);
			toast.error("エラーが発生しました");
		}
	}, [audioButtonId, isLiked, likeCount]);

	const handleLikeToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("いいねするにはログインが必要です");
			return;
		}

		startTransition(() => {
			performLikeToggle();
		});
	}, [isAuthenticated, performLikeToggle]);

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleLikeToggle}
			disabled={isPending || !isAuthenticated}
			className={`flex items-center gap-1.5 ${
				isLiked ? "text-red-600 hover:text-red-700" : "text-muted-foreground hover:text-red-600"
			} ${className || ""}`}
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
	);
}
