import { cn } from "@suzumina.click/ui/lib/utils";
import type { ReactNode } from "react";

export interface EmptyStateProps {
	/** アイコン（lucide 等、既にレンダリング済みの要素） */
	icon?: ReactNode;
	/** 見出し */
	title: string;
	/**
	 * title のタグ。既定は "p"。呼び出し側の文脈で見出し階層上の意味を持たせたい場合
	 * （例: このブロックがページ内で唯一の h3 相当になる場合）は "h3" を指定する。
	 * 見た目（文字サイズ・太さ）は他の EmptyState と統一するため変えない。
	 */
	titleAs?: "p" | "h3";
	/** 補足説明 */
	description?: string;
	/** アクション（ボタン・リンク等） */
	action?: ReactNode;
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
	titleAs = "p",
	description,
	action,
	size = "default",
	className,
}: EmptyStateProps) {
	const Title = titleAs;
	return (
		<div className={cn("text-center", size === "sm" ? "py-6" : "py-12", className)}>
			{icon && (
				<div
					className={cn(
						"mx-auto mb-4 text-muted-foreground",
						size === "sm" ? "h-8 w-8" : "h-12 w-12",
					)}
				>
					{icon}
				</div>
			)}
			<Title className={cn("text-muted-foreground", size === "sm" ? "text-sm" : "text-lg")}>
				{title}
			</Title>
			{description && (
				<p className={cn("mt-2 text-muted-foreground", size === "sm" && "text-xs")}>
					{description}
				</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
