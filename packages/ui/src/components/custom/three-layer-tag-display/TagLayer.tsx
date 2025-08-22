/**
 * タグレイヤー表示コンポーネント
 */

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import type { MouseEvent } from "react";
import { HighlightText } from "../highlight-text";

interface TagLayerProps {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	tags: string[];
	layer: "playlist" | "user" | "category";
	badgeClassName: string;
	displayData: { displayed: string[]; hasMore: boolean; moreCount: number };
	sizeClasses: {
		badge: string;
		icon: string;
		title: string;
		layerContainer: string;
	};
	showEmptyLayers: boolean;
	onTagClick?: (tag: string, layer: "playlist" | "user" | "category") => void;
	searchQuery?: string;
	highlightClassName?: string;
}

export function TagLayer({
	title,
	icon,
	tags,
	layer,
	badgeClassName,
	displayData,
	sizeClasses,
	showEmptyLayers,
	onTagClick,
	searchQuery,
	highlightClassName,
}: TagLayerProps) {
	if (!showEmptyLayers && tags.length === 0) return null;

	const IconComponent = icon;

	const handleTagClick = (
		tag: string,
		layerType: "playlist" | "user" | "category",
		event: MouseEvent<HTMLElement>,
	) => {
		if (onTagClick) {
			event.preventDefault();
			event.stopPropagation();
			onTagClick(tag, layerType);
		}
	};

	const getLayerDescription = () => {
		if (layer === "playlist") {
			return "(録画時間による自動分類)";
		}
		if (layer === "user") {
			return "(ユーザーが自由に追加)";
		}
		return null;
	};

	const description = getLayerDescription();

	return (
		<div className="space-y-2">
			<h4 className={cn("font-medium text-muted-foreground flex items-center", sizeClasses.title)}>
				<IconComponent className={sizeClasses.icon} />
				{title}
				{description && <span className="text-xs text-muted-foreground ml-2">{description}</span>}
			</h4>
			<div className={cn("flex flex-wrap", sizeClasses.layerContainer)}>
				{displayData.displayed.map((tag, index) => (
					<Badge
						key={`${tag}-${index}`}
						className={cn(
							sizeClasses.badge,
							badgeClassName,
							onTagClick && "cursor-pointer",
							"transition-all duration-200",
						)}
						onClick={onTagClick ? (e) => handleTagClick(tag, layer, e) : undefined}
					>
						{searchQuery ? (
							<HighlightText
								text={tag}
								searchQuery={searchQuery}
								highlightClassName={
									highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
								}
							/>
						) : (
							tag
						)}
					</Badge>
				))}
				{displayData.hasMore && (
					<Badge
						variant="outline"
						className={cn(sizeClasses.badge, "text-muted-foreground bg-muted/30")}
					>
						+{displayData.moreCount}個
					</Badge>
				)}
				{tags.length === 0 && showEmptyLayers && (
					<span className="text-xs text-muted-foreground italic">設定なし</span>
				)}
			</div>
		</div>
	);
}
