/**
 * コンパクト表示用のタグ表示コンポーネント
 */

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import type { MouseEvent } from "react";
import { HighlightText } from "../highlight-text";

interface TagData {
	text: string;
	type: "category" | "playlist" | "user";
	className: string;
}

interface CompactTagDisplayProps {
	allTags: TagData[];
	sizeClasses: { badge: string; layerContainer: string };
	onTagClick?: (tag: string, layer: "playlist" | "user" | "category") => void;
	searchQuery?: string;
	highlightClassName?: string;
	className?: string;
}

export function CompactTagDisplay({
	allTags,
	sizeClasses,
	onTagClick,
	searchQuery,
	highlightClassName,
	className,
}: CompactTagDisplayProps) {
	const handleTagClick = (
		tag: string,
		layer: "playlist" | "user" | "category",
		event: MouseEvent<HTMLElement>,
	) => {
		if (onTagClick) {
			event.preventDefault();
			event.stopPropagation();
			onTagClick(tag, layer);
		}
	};

	return (
		<div className={cn("flex flex-wrap", sizeClasses.layerContainer, className)}>
			{allTags.map((tag, index) => (
				<Badge
					key={`${tag.type}-${tag.text}-${index}`}
					className={cn(
						sizeClasses.badge,
						tag.className,
						onTagClick && "cursor-pointer",
						"transition-all duration-200",
					)}
					onClick={onTagClick ? (e) => handleTagClick(tag.text, tag.type, e) : undefined}
				>
					{searchQuery ? (
						<HighlightText
							text={tag.text}
							searchQuery={searchQuery}
							highlightClassName={
								highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
							}
						/>
					) : (
						tag.text
					)}
				</Badge>
			))}
		</div>
	);
}
