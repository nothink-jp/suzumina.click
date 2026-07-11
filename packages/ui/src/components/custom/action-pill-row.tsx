"use client";

import { cn } from "@suzumina.click/ui/lib/utils";
import { Heart, ThumbsUp } from "lucide-react";
import { XIcon } from "./x-icon";

/**
 * アクションピル行（ボタン画面刷新の共通部品・SPR-254）。
 * お気に入り / 高評価 / Xで共有 のピル型アクション群。**見た目のみ**を持ち、
 * お気に入り・高評価の状態解決やアクション実行は呼び出し側（apps/web の client island）の責務。
 * 低評価 UI は製品判断により持たない（データ/action は温存・UI のみ撤去）。
 * デザイン正本: Claude Design「アクションピル行.dc.html」（default=詳細ページ / sm=モーダル）
 */

interface ActionPillRowProps {
	/** default=詳細ページ用 / sm=モーダル用 */
	size?: "default" | "sm";
	isFavorite: boolean;
	onFavoriteToggle?: () => void;
	isLiked: boolean;
	likeCount: number;
	onLikeToggle?: () => void;
	/** X 共有の intent URL（組み立ては呼び出し側の責務） */
	shareUrl: string;
	className?: string;
}

export function ActionPillRow({
	size = "default",
	isFavorite,
	onFavoriteToggle,
	isLiked,
	likeCount,
	onLikeToggle,
	shareUrl,
	className,
}: ActionPillRowProps) {
	const sm = size === "sm";
	const pillBase = cn(
		"inline-flex cursor-pointer items-center rounded-full border font-bold transition-colors",
		"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
		sm ? "gap-[7px] px-4 py-2 text-[13px]" : "gap-2 px-5 py-2.5 text-sm",
	);
	const iconSize = sm ? "h-3.5 w-3.5" : "h-4 w-4";

	return (
		<div className={cn("flex flex-wrap justify-center", sm ? "gap-2" : "gap-2.5", className)}>
			<button
				type="button"
				onClick={onFavoriteToggle}
				aria-pressed={isFavorite}
				className={cn(
					pillBase,
					isFavorite
						? "border-heart bg-heart text-heart-foreground"
						: "border-border bg-card text-heart hover:border-heart hover:bg-heart/5",
				)}
			>
				<Heart className={cn(iconSize, isFavorite && "fill-current")} />
				{isFavorite ? "お気に入り済み" : "お気に入り"}
			</button>

			<button
				type="button"
				onClick={onLikeToggle}
				aria-pressed={isLiked}
				className={cn(
					pillBase,
					"border-border bg-card hover:bg-accent",
					isLiked ? "text-suzuka-600" : "text-foreground",
				)}
			>
				<ThumbsUp className={cn(iconSize, isLiked && "fill-current")} />
				{sm ? likeCount : `高評価 ${likeCount}`}
			</button>

			<a
				href={shareUrl}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(
					pillBase,
					"border-foreground bg-foreground text-background no-underline hover:opacity-85",
				)}
			>
				<XIcon className={sm ? "h-3 w-3" : "h-3.5 w-3.5"} />
				{sm ? "共有" : "Xで共有"}
			</a>
		</div>
	);
}
