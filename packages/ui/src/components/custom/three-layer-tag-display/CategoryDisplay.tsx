/**
 * カテゴリー/ジャンル表示コンポーネント
 */

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import { FolderOpen } from "lucide-react";
import type { MouseEvent } from "react";
import { HighlightText } from "../highlight-text";

interface CategoryDisplayProps {
	categoryName: string;
	sizeClasses: {
		badge: string;
		icon: string;
		title: string;
		layerContainer: string;
	};
	onTagClick?: (tag: string, layer: "playlist" | "user" | "category") => void;
	searchQuery?: string;
	highlightClassName?: string;
}

export function CategoryDisplay({
	categoryName,
	sizeClasses,
	onTagClick,
	searchQuery,
	highlightClassName,
}: CategoryDisplayProps) {
	const handleClick = (event: MouseEvent<HTMLElement>) => {
		if (onTagClick) {
			event.preventDefault();
			event.stopPropagation();
			onTagClick(categoryName, "category");
		}
	};

	return (
		<div className="space-y-2">
			<h4 className={cn("font-medium text-muted-foreground flex items-center", sizeClasses.title)}>
				<FolderOpen className={sizeClasses.icon} />
				ジャンル
				<span className="text-xs text-muted-foreground ml-2">(YouTube分類)</span>
			</h4>
			<div className={cn("flex flex-wrap", sizeClasses.layerContainer)}>
				<Badge
					className={cn(
						sizeClasses.badge,
						"bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
						onTagClick && "cursor-pointer",
						"transition-all duration-200",
					)}
					onClick={onTagClick ? handleClick : undefined}
				>
					{searchQuery ? (
						<HighlightText
							text={categoryName}
							searchQuery={searchQuery}
							highlightClassName={
								highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
							}
						/>
					) : (
						categoryName
					)}
				</Badge>
			</div>
		</div>
	);
}
