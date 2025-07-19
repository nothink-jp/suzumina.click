/**
 * TagList - 統一されたタグ表示コンポーネント
 *
 * 使用箇所:
 * - 音声ボタンコンポーネント（プルダウンメニュー）
 * - 音声ボタン詳細画面
 * - 動画詳細画面
 * - 作品詳細画面
 * - その他の将来的なタグ表示箇所
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Tag } from "lucide-react";
import type { MouseEvent } from "react";
import { HighlightText } from "./highlight-text";

export interface TagListProps {
	/** 表示するタグの配列 */
	tags: string[];
	/** Badgeのバリアント */
	variant?: "default" | "destructive" | "outline" | "secondary";
	/** タグアイコンを表示するかどうか */
	showIcon?: boolean;
	/** 表示する最大タグ数（0の場合は制限なし） */
	maxTags?: number;
	/** 検索クエリ（ハイライト機能用） */
	searchQuery?: string;
	/** ハイライト時のクラス名 */
	highlightClassName?: string;
	/** コンテナのクラス名 */
	className?: string;
	/** 個別タグのクラス名 */
	tagClassName?: string;
	/** タグクリック時のコールバック */
	onTagClick?: (tag: string) => void;
	/** タグの表示サイズ */
	size?: "sm" | "default" | "lg";
}

export function TagList({
	tags,
	variant = "outline",
	showIcon = true,
	maxTags = 0,
	searchQuery,
	highlightClassName,
	className,
	tagClassName,
	onTagClick,
	size = "default",
}: TagListProps) {
	// 空のタグ配列の場合は何も表示しない
	if (!tags || tags.length === 0) {
		return null;
	}

	// 表示するタグを制限
	const displayTags = maxTags > 0 ? tags.slice(0, maxTags) : tags;
	const hasMoreTags = maxTags > 0 && tags.length > maxTags;

	// サイズに応じたクラス名
	const getSizeClasses = () => {
		switch (size) {
			case "sm":
				return {
					container: "gap-1",
					badge: "text-xs h-6",
					icon: "h-2.5 w-2.5 mr-0.5",
				};
			case "lg":
				return {
					container: "gap-3",
					badge: "text-sm h-8",
					icon: "h-4 w-4 mr-1.5",
				};
			default:
				return {
					container: "gap-2",
					badge: "text-xs h-7",
					icon: "h-3 w-3 mr-1",
				};
		}
	};

	const sizeClasses = getSizeClasses();

	// タグクリックハンドラー
	const handleTagClick = (tag: string, event: MouseEvent<HTMLElement>) => {
		if (onTagClick) {
			event.preventDefault();
			event.stopPropagation();
			onTagClick(tag);
		}
	};

	// デフォルトのタグクラス名（バリアントに応じて）
	const getDefaultTagClassName = () => {
		switch (variant) {
			case "outline":
				return "bg-background/80 text-suzuka-700 border-suzuka-300 hover:bg-suzuka-50 transition-colors";
			case "secondary":
				return "bg-suzuka-100 text-suzuka-700 hover:bg-suzuka-200 transition-colors";
			default:
				return "";
		}
	};

	return (
		<div className={cn("flex flex-wrap", sizeClasses.container, className)}>
			{displayTags.map((tag, index) => (
				<Badge
					key={`${tag}-${index}`}
					variant={variant}
					className={cn(
						sizeClasses.badge,
						getDefaultTagClassName(),
						onTagClick && "cursor-pointer",
						tagClassName,
					)}
					onClick={onTagClick ? (e) => handleTagClick(tag, e) : undefined}
				>
					{showIcon && <Tag className={sizeClasses.icon} />}
					{searchQuery ? (
						<HighlightText
							text={tag}
							searchQuery={searchQuery}
							highlightClassName={
								highlightClassName || "bg-suzuka-200 text-suzuka-900 px-1 rounded"
							}
						/>
					) : (
						tag
					)}
				</Badge>
			))}
			{hasMoreTags && (
				<Badge variant="secondary" className={cn(sizeClasses.badge, "text-muted-foreground")}>
					+{tags.length - maxTags}個
				</Badge>
			)}
		</div>
	);
}
