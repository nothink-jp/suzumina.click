"use client";

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import { ArrowRight, Clock, Lock, User, Video } from "lucide-react";
import { useId } from "react";
import { ActionPillRow } from "./action-pill-row";
import { HighlightText } from "./highlight-text";
import { TagList } from "./tag-list";
import { YoutubeIcon } from "./youtube-icon";

/**
 * AudioButton のポップオーバー内容（SPR-257 で audio-button.tsx から分離）。
 * アクション層は詳細ページ・モーダルと同じピル語彙（ActionPillRow）に統一し、
 * 低評価 UI は持たない（製品判断・データ/action は温存）。
 * 契約: onFavoriteToggle / onLikeToggle は**両方セットで渡す**（片方のみは想定外で、
 * その場合はピル行ごと非表示になる。正本の呼び出し元は audio-button-with-favorite-client）。
 */

export interface AudioButtonPopoverContentProps {
	audioButton: AudioButtonType;
	duration: number;
	youtubeUrl: string;
	isFavorite: boolean;
	onFavoriteToggle?: () => void;
	isLiked: boolean;
	onLikeToggle?: () => void;
	showDetailLink: boolean;
	onDetailClick?: () => void;
	onPopoverClose: () => void;
	searchQuery?: string;
	highlightClassName?: string;
	isAuthenticated: boolean;
	xShareUrl?: string;
}

function PopoverTitle({
	text,
	searchQuery,
	highlightClassName,
}: {
	text: string;
	searchQuery?: string;
	highlightClassName?: string;
}) {
	if (!searchQuery) return <>{text}</>;
	return (
		<HighlightText
			text={text}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName || "bg-primary/20 text-foreground px-1 rounded"}
		/>
	);
}

function PopoverDescription({
	description,
	searchQuery,
	highlightClassName,
}: {
	description: string | undefined;
	searchQuery?: string;
	highlightClassName?: string;
}) {
	if (!description) return null;
	return (
		<p className="text-sm text-muted-foreground mt-1 leading-relaxed">
			<PopoverTitle
				text={description}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName}
			/>
		</p>
	);
}

// 見出し層: タイトル + 秒数/再生数チップ + 説明
function PopoverHeader({
	audioButton,
	duration,
	searchQuery,
	highlightClassName,
}: {
	audioButton: AudioButtonType;
	duration: number;
	searchQuery?: string;
	highlightClassName?: string;
}) {
	return (
		<div>
			<h4 className="font-semibold text-base text-foreground leading-tight">
				<PopoverTitle
					text={audioButton.buttonText}
					searchQuery={searchQuery}
					highlightClassName={highlightClassName}
				/>
			</h4>
			<div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
				<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">
					<Clock className="h-3 w-3" />
					{duration.toFixed(1)}秒
				</span>
				<span>再生 {audioButton.stats.playCount}回</span>
			</div>
			<PopoverDescription
				description={audioButton.description}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName}
			/>
		</div>
	);
}

// 出典リスト層: 作成者・元動画への導線
function PopoverMetaList({ audioButton }: { audioButton: AudioButtonType }) {
	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<a
				href={`/users/${audioButton.creatorId}`}
				className="flex min-h-[38px] items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
				onClick={(e) => e.stopPropagation()}
			>
				<User className="h-3.5 w-3.5 flex-none text-muted-foreground" />
				<span className="min-w-0 flex-1 truncate">{audioButton.creatorName}</span>
				<span className="flex-none text-muted-foreground">作成者</span>
			</a>
			{audioButton.videoTitle && (
				<a
					href={`/videos/${audioButton.videoId}`}
					className="flex min-h-[38px] items-center gap-2 border-t border-border px-3 py-2 text-xs hover:bg-accent transition-colors"
					onClick={(e: React.MouseEvent) => e.stopPropagation()}
					title={audioButton.videoTitle}
				>
					<Video className="h-3.5 w-3.5 flex-none text-muted-foreground" />
					<span className="min-w-0 flex-1 truncate">{audioButton.videoTitle}</span>
					<span className="flex-none text-muted-foreground">元動画</span>
				</a>
			)}
		</div>
	);
}

function PopoverTags({
	audioButton,
	searchQuery,
	highlightClassName,
}: {
	audioButton: AudioButtonType;
	searchQuery?: string;
	highlightClassName?: string;
}) {
	if (!audioButton.tags || audioButton.tags.length === 0) return null;
	return (
		<div>
			<p className="text-xs text-muted-foreground mb-2">タグ</p>
			<TagList
				tags={audioButton.tags}
				variant="outline"
				showIcon={true}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName || "bg-primary/20 text-foreground px-1 rounded"}
				size="default"
			/>
		</div>
	);
}

export function AudioButtonPopoverContent({
	audioButton,
	duration,
	youtubeUrl,
	isFavorite,
	onFavoriteToggle,
	isLiked,
	onLikeToggle,
	showDetailLink,
	onDetailClick,
	onPopoverClose,
	searchQuery,
	highlightClassName,
	isAuthenticated,
	xShareUrl,
}: AudioButtonPopoverContentProps) {
	const authNoteId = useId();
	const subPill = cn(
		"inline-flex items-center gap-[7px] rounded-full border px-4 py-2 text-[13px] font-bold transition-colors no-underline",
		"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
	);

	return (
		<div className="p-4 space-y-4">
			{/* 見出し層: タイトル・秒数/再生数・説明 */}
			<PopoverHeader
				audioButton={audioButton}
				duration={duration}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName}
			/>

			{/* 出典リスト層: 作成者・元動画 */}
			<PopoverMetaList audioButton={audioButton} />

			{/* タグ層 */}
			<PopoverTags
				audioButton={audioButton}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName}
			/>

			{/* アクション層（詳細ページ・モーダルと同じピル語彙・SPR-257） */}
			<div className="space-y-2.5 border-t border-border pt-3">
				{!isAuthenticated && (
					<p id={authNoteId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Lock className="h-3 w-3" />
						お気に入り・評価にはログインが必要です
					</p>
				)}
				{onFavoriteToggle && onLikeToggle && (
					<ActionPillRow
						size="sm"
						className="justify-start"
						isFavorite={isFavorite}
						onFavoriteToggle={onFavoriteToggle}
						isLiked={isLiked}
						likeCount={audioButton.stats.likeCount}
						onLikeToggle={onLikeToggle}
						shareUrl={xShareUrl}
					/>
				)}
				<div className="flex flex-wrap items-center gap-2">
					<a
						href={youtubeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(subPill, "border-border bg-card text-foreground hover:bg-accent")}
						onClick={(e) => e.stopPropagation()}
					>
						<YoutubeIcon className="h-3.5 w-3.5" />
						YouTube
					</a>
					{showDetailLink && onDetailClick && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDetailClick();
								onPopoverClose();
							}}
							aria-label="詳細ページを開く"
							className={cn(
								subPill,
								"ml-auto cursor-pointer border-transparent bg-transparent text-suzuka-600 hover:bg-accent hover:text-suzuka-700",
							)}
						>
							詳細
							<ArrowRight className="h-3 w-3" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
