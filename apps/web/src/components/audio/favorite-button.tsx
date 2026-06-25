"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getFavoritesStatusAction, toggleFavoriteAction } from "@/actions/favorites";
import { useSession } from "@/lib/auth/client";

interface FavoriteButtonProps {
	audioButtonId: string;
	isFavorited?: boolean;
	favoriteCount?: number;
	showCount?: boolean;
	size?: "sm" | "default" | "lg";
	className?: string;
}

export function FavoriteButton({
	audioButtonId,
	isFavorited: initialIsFavorited = false,
	favoriteCount = 0,
	showCount = true,
	size = "default",
	className,
}: FavoriteButtonProps) {
	const router = useRouter();
	// 認証状態は client の session から解決（per-user 状態を SSR に焼かない・SPR-223）
	const user = useSession();
	const isAuthenticated = !!user;
	const [isPending, startTransition] = useTransition();
	const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

	// Sync internal state when prop changes (important for testing)
	useEffect(() => {
		setIsFavorited(initialIsFavorited);
	}, [initialIsFavorited]);

	// お気に入り状態は SSR に焼かず、認証済みなら client で自分の状態を取得する（純公開 shell・SPR-223）。
	// これにより詳細ページを共有キャッシュ可（public）に戻しても A の状態が B に漏れない。
	useEffect(() => {
		if (!isAuthenticated) return;
		let cancelled = false;
		void getFavoritesStatusAction([audioButtonId]).then((statusMap) => {
			if (!cancelled) setIsFavorited(statusMap.get(audioButtonId) ?? false);
		});
		return () => {
			cancelled = true;
		};
	}, [audioButtonId, isAuthenticated]);

	const handleToggle = () => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			router.push("/auth/signin");
			return;
		}

		startTransition(async () => {
			const previousIsFavorited = isFavorited;

			// 楽観的UI更新
			setIsFavorited(!isFavorited);

			try {
				const result = await toggleFavoriteAction(audioButtonId);
				if (result.success && result.isFavorited !== undefined) {
					setIsFavorited(result.isFavorited);
					toast.success(
						result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
					);
				} else {
					// エラー時は楽観的更新をロールバック
					setIsFavorited(previousIsFavorited);
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (_error) {
				// エラー時は楽観的更新をロールバック
				setIsFavorited(previousIsFavorited);
				toast.error("エラーが発生しました");
			}
		});
	};

	const sizeClasses = {
		sm: "h-11 w-11 sm:h-8 sm:w-8",
		default: "h-11 w-11 sm:h-10 sm:w-10",
		lg: "h-12 w-12",
	};

	const iconSizes = {
		sm: "h-4 w-4",
		default: "h-5 w-5",
		lg: "h-6 w-6",
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Button
				variant={isFavorited ? "default" : "outline"}
				size="icon"
				className={cn(
					sizeClasses[size],
					isFavorited && "bg-heart text-heart-foreground hover:bg-heart/90", // 桜霞: お気に入り active は heart 差し色（semantic role）
					"transition-all duration-200",
				)}
				onClick={handleToggle}
				disabled={isPending}
				aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
			>
				<Heart
					className={cn(
						iconSizes[size],
						isFavorited ? "fill-current" : "",
						isPending && "animate-pulse",
					)}
				/>
			</Button>
			{showCount && (
				<span className="text-sm text-muted-foreground min-w-[2rem]">
					{favoriteCount > 0 ? favoriteCount.toLocaleString("ja-JP") : ""}
				</span>
			)}
		</div>
	);
}
