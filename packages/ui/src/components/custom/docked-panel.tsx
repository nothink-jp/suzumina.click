import { cn } from "@suzumina.click/ui/lib/utils";
import type * as React from "react";

interface DockedPanelProps extends React.ComponentProps<"div"> {
	/** 広い画面での配置角。 */
	position: "bottom-right" | "bottom-left";
	/** "card"（角丸xl。年齢確認カード/トースト等）か "pill"（角丸full。Cookieバー等）。 */
	variant?: "card" | "pill";
	role?: "region" | "status";
	/**
	 * 狭い画面で全幅ボトムシート化するか（既定 true）。年齢確認カード/Cookieバー本体は
	 * コンテンツ量が多く全幅化が必要だが、常時コンパクトに留めたい要素（表示設定の
	 * 再オープンピル等）は false にする。同じドック位置を使う複数パネルが同時に
	 * 表示されても重ならないようにするための呼び出し側の責務であり、このコンポーネント
	 * 自体は複数パネル間の自動スタッキングは行わない。
	 */
	mobileSheet?: boolean;
}

/**
 * 画面の角にドッキングする非モーダルパネル: 角丸・枠線・shadow — backdropで
 * 塞ぐブロッキングオーバーレイにはしない。
 */
export function DockedPanel({
	position,
	variant = "card",
	role = "region",
	mobileSheet = true,
	className,
	...props
}: DockedPanelProps) {
	return (
		<div
			role={role}
			className={cn(
				"fixed z-50 border bg-card text-card-foreground shadow-xl",
				mobileSheet &&
					"inset-x-0 bottom-0 w-full rounded-t-2xl sm:inset-x-auto sm:bottom-4 sm:w-auto",
				mobileSheet && variant === "pill" && "sm:rounded-full sm:shadow-lg",
				mobileSheet && variant === "card" && "sm:rounded-xl",
				mobileSheet && position === "bottom-right" && "sm:right-4",
				mobileSheet && position === "bottom-left" && "sm:left-4",
				!mobileSheet && "bottom-4 w-auto rounded-full shadow-lg",
				!mobileSheet && position === "bottom-right" && "right-4",
				!mobileSheet && position === "bottom-left" && "left-4",
				className,
			)}
			{...props}
		/>
	);
}
