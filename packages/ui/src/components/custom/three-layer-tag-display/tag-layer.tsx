/**
 * タグレイヤー表示コンポーネント
 */

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import Link from "next/link";
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
	/** タグの遷移先 href ビルダー。指定時は onTagClick より優先し <Link> を描画する */
	tagHref?: (tag: string, layer: "playlist" | "user" | "category") => string;
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
	tagHref,
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

	const renderContent = (text: string) =>
		searchQuery ? (
			<HighlightText
				text={text}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"}
			/>
		) : (
			text
		);

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
				{displayData.displayed.map((tag, index) => {
					const itemClassName = cn(
						sizeClasses.badge,
						badgeClassName,
						(tagHref || onTagClick) && "cursor-pointer",
						"transition-all duration-200",
					);

					if (tagHref) {
						return (
							<Badge key={`${tag}-${index}`} asChild className={itemClassName}>
								<Link href={tagHref(tag, layer)}>{renderContent(tag)}</Link>
							</Badge>
						);
					}

					return (
						<Badge
							key={`${tag}-${index}`}
							className={itemClassName}
							onClick={onTagClick ? (e) => handleTagClick(tag, layer, e) : undefined}
						>
							{renderContent(tag)}
						</Badge>
					);
				})}
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
