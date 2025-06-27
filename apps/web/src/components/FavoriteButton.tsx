"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/actions/favorites";

interface FavoriteButtonProps {
	audioButtonId: string;
	isFavorited: boolean;
	favoriteCount?: number;
	showCount?: boolean;
	size?: "sm" | "default" | "lg";
	className?: string;
	isAuthenticated?: boolean;
}

export function FavoriteButton({
	audioButtonId,
	isFavorited: initialIsFavorited,
	favoriteCount = 0,
	showCount = true,
	size = "default",
	className,
	isAuthenticated = false,
}: FavoriteButtonProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleToggle = () => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			router.push("/auth/signin");
			return;
		}

		startTransition(async () => {
			try {
				const result = await toggleFavoriteAction(audioButtonId);
				if (result.success && result.isFavorited !== undefined) {
					toast.success(
						result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
					);
					router.refresh();
				} else {
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (error) {
				toast.error("エラーが発生しました");
			}
		});
	};

	const sizeClasses = {
		sm: "h-8 w-8",
		default: "h-10 w-10",
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
				variant={initialIsFavorited ? "default" : "outline"}
				size="icon"
				className={cn(
					sizeClasses[size],
					initialIsFavorited && "bg-suzuka-500 hover:bg-suzuka-600",
					"transition-all duration-200",
				)}
				onClick={handleToggle}
				disabled={isPending}
				aria-label={initialIsFavorited ? "お気に入りから削除" : "お気に入りに追加"}
			>
				<Heart
					className={cn(
						iconSizes[size],
						initialIsFavorited ? "fill-current" : "",
						isPending && "animate-pulse",
					)}
				/>
			</Button>
			{showCount && (
				<span className="text-sm text-muted-foreground min-w-[2rem]">
					{favoriteCount > 0 ? favoriteCount.toLocaleString() : ""}
				</span>
			)}
		</div>
	);
}
