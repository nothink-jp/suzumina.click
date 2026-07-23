import { IconStack } from "@suzumina.click/ui/components/ui/icon-stack";
import { cn } from "@suzumina.click/ui/lib/utils";
import type { ReactNode } from "react";

export interface EmptyStateProps {
	/** アイコン（lucide 等、既にレンダリング済みの要素） */
	icon?: ReactNode;
	/** 見出し */
	title: string;
	/** 補足説明 */
	description?: string;
	/** アクション（ボタン・リンク等） */
	action?: ReactNode;
	/**
	 * true で icon を IconStack（積み重なったカードの装飾イラスト）に乗せる。
	 * 一覧ページの検索結果ゼロや「まだ何もない」系のような、ページの主役となる
	 * 空表示向け。false（既定）はアイコン単体の軽量表示で、詳細ページ内セクションの
	 * ような補助的な空表示向け。
	 */
	illustrated?: boolean;
	/** "sm" は詳細ページ内セクションのようなコンパクトな文脈向け（既定は "default"） */
	size?: "sm" | "default";
	className?: string;
}

/**
 * 空状態（データなし・検索結果なし）の共通表示。
 * アイコン・見出し・説明・アクションの組み合わせを一元化する（ADR-012）。
 */
export function EmptyState({
	icon,
	title,
	description,
	action,
	illustrated = false,
	size = "default",
	className,
}: EmptyStateProps) {
	return (
		<div className={cn("text-center", size === "sm" ? "py-6" : "py-12", className)}>
			{icon &&
				(illustrated ? (
					<IconStack className="mx-auto mb-4">{icon}</IconStack>
				) : (
					<div
						className={cn(
							"mx-auto mb-4 text-muted-foreground",
							size === "sm" ? "h-8 w-8" : "h-12 w-12",
						)}
					>
						{icon}
					</div>
				))}
			<p className={cn("text-muted-foreground", size === "sm" ? "text-sm" : "text-lg")}>{title}</p>
			{description && (
				<p className={cn("mt-2 text-muted-foreground", size === "sm" && "text-xs")}>
					{description}
				</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
