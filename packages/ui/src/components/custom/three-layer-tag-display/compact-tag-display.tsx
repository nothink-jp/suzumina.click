/**
 * コンパクト表示用のタグ表示コンポーネント
 */

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import Link from "next/link";
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
	/** タグの遷移先 href ビルダー。指定時は onTagClick より優先し <Link> を描画する */
	tagHref?: (tag: string, layer: "playlist" | "user" | "category") => string;
	searchQuery?: string;
	highlightClassName?: string;
	className?: string;
}

export function CompactTagDisplay({
	allTags,
	sizeClasses,
	onTagClick,
	tagHref,
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

	const renderContent = (text: string) =>
		searchQuery ? (
			<HighlightText
				text={text}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName || "bg-primary/20 text-foreground px-1 rounded"}
			/>
		) : (
			text
		);

	if (allTags.length === 0) return null;

	return (
		<ul className={cn("flex flex-wrap", sizeClasses.layerContainer, className)} aria-label="タグ">
			{allTags.map((tag, index) => {
				const badgeClassName = cn(
					sizeClasses.badge,
					tag.className,
					(tagHref || onTagClick) && "cursor-pointer",
					"transition-all duration-200",
				);

				return (
					<li key={`${tag.type}-${tag.text}-${index}`}>
						{tagHref ? (
							<Badge asChild className={badgeClassName}>
								<Link href={tagHref(tag.text, tag.type)}>{renderContent(tag.text)}</Link>
							</Badge>
						) : (
							<Badge
								className={badgeClassName}
								onClick={onTagClick ? (e) => handleTagClick(tag.text, tag.type, e) : undefined}
							>
								{renderContent(tag.text)}
							</Badge>
						)}
					</li>
				);
			})}
		</ul>
	);
}
