/**
 * プール化対応 AudioButton コンポーネント
 *
 * 変更点:
 * - SimpleAudioButton → AudioButton（命名統一）
 * - AudioOnlyPlayer → AudioPlayer（プール化対応）
 * - パフォーマンス最適化
 */

"use client";

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import {
	ArrowRight,
	Clock,
	Heart,
	Loader2,
	Lock,
	MoreHorizontal,
	Pause,
	Play,
	ThumbsDown,
	ThumbsUp,
	User,
	Video,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { type AudioControls, AudioPlayer } from "./audio-player";
import { HighlightText } from "./highlight-text";
import { TagList } from "./tag-list";
import { YoutubeIcon } from "./youtube-icon";

interface AudioButtonProps {
	audioButton: AudioButtonType;
	onPlay?: () => void;
	className?: string;
	maxTitleLength?: number;
	showDetailLink?: boolean;
	onDetailClick?: () => void;
	// お気に入り関連
	isFavorite?: boolean;
	onFavoriteToggle?: () => void;
	// いいね関連
	isLiked?: boolean;
	onLikeToggle?: () => void;
	// 低評価関連
	isDisliked?: boolean;
	onDislikeToggle?: () => void;
	// ハイライト関連
	searchQuery?: string;
	highlightClassName?: string;
	// 認証関連
	isAuthenticated?: boolean;
}

interface AudioButtonPopoverContentProps {
	audioButton: AudioButtonType;
	duration: number;
	youtubeUrl: string;
	isFavorite: boolean;
	onFavoriteToggle?: () => void;
	isLiked: boolean;
	onLikeToggle?: () => void;
	isDisliked: boolean;
	onDislikeToggle?: () => void;
	showDetailLink: boolean;
	onDetailClick?: () => void;
	onPopoverClose: () => void;
	searchQuery?: string;
	highlightClassName?: string;
	isAuthenticated: boolean;
}

// Extracted components for reducing complexity
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

// Tags section component
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

// Favorite button component
function FavoriteButton({
	isFavorite,
	onFavoriteToggle,
}: {
	isFavorite?: boolean;
	onFavoriteToggle?: () => void;
}) {
	if (!onFavoriteToggle) return null;

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onFavoriteToggle();
			}}
			aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
			className={cn(
				"flex items-center justify-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-semibold transition-colors hover:bg-accent",
				isFavorite ? "text-suzuka-600" : "text-muted-foreground hover:text-foreground",
			)}
		>
			<Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
		</button>
	);
}

// Like/Dislike buttons component
function LikeDislikeButtons({
	audioButton,
	isLiked,
	onLikeToggle,
	isDisliked,
	onDislikeToggle,
}: {
	audioButton: AudioButtonType;
	isLiked?: boolean;
	onLikeToggle?: () => void;
	isDisliked?: boolean;
	onDislikeToggle?: () => void;
}) {
	if (!onLikeToggle) return null;

	return (
		<div className="flex items-center">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onLikeToggle();
				}}
				className={cn(
					"flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-semibold transition-colors hover:bg-accent",
					isLiked ? "text-suzuka-600" : "text-muted-foreground hover:text-foreground",
				)}
			>
				<ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
				<span>{audioButton.stats.likeCount}</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onDislikeToggle?.();
				}}
				aria-label={isDisliked ? "低評価を取り消す" : "低評価する"}
				className="flex items-center justify-center h-10 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			>
				<ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
			</button>
		</div>
	);
}

// Action buttons component
function PopoverActions({
	audioButton,
	youtubeUrl,
	isFavorite,
	onFavoriteToggle,
	isLiked,
	onLikeToggle,
	isDisliked,
	onDislikeToggle,
	showDetailLink,
	onDetailClick,
	onPopoverClose,
}: {
	audioButton: AudioButtonType;
	youtubeUrl: string;
	isFavorite?: boolean;
	onFavoriteToggle?: () => void;
	isLiked?: boolean;
	onLikeToggle?: () => void;
	isDisliked?: boolean;
	onDislikeToggle?: () => void;
	showDetailLink?: boolean;
	onDetailClick?: () => void;
	onPopoverClose?: () => void;
}) {
	return (
		<div className="flex gap-1 items-center flex-wrap">
			<FavoriteButton isFavorite={isFavorite} onFavoriteToggle={onFavoriteToggle} />

			<LikeDislikeButtons
				audioButton={audioButton}
				isLiked={isLiked}
				onLikeToggle={onLikeToggle}
				isDisliked={isDisliked}
				onDislikeToggle={onDislikeToggle}
			/>

			<a
				href={youtubeUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
				onClick={(e) => e.stopPropagation()}
			>
				<YoutubeIcon className="h-4 w-4" />
				YouTube
			</a>

			{showDetailLink && onDetailClick && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDetailClick();
						onPopoverClose?.();
					}}
					aria-label="詳細ページを開く"
					className="flex items-center gap-1 h-10 px-2.5 ml-auto rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
				>
					詳細
					<ArrowRight className="h-3 w-3" />
				</button>
			)}
		</div>
	);
}

function AudioButtonPopoverContent({
	audioButton,
	duration,
	youtubeUrl,
	isFavorite,
	onFavoriteToggle,
	isLiked,
	onLikeToggle,
	isDisliked,
	onDislikeToggle,
	showDetailLink,
	onDetailClick,
	onPopoverClose,
	searchQuery,
	highlightClassName,
	isAuthenticated,
}: AudioButtonPopoverContentProps) {
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

			{/* アクション層 */}
			<div className="space-y-2 border-t border-border pt-3">
				{!isAuthenticated && (
					<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Lock className="h-3 w-3" />
						お気に入り・評価にはログインが必要です
					</p>
				)}
				<PopoverActions
					audioButton={audioButton}
					youtubeUrl={youtubeUrl}
					isFavorite={isFavorite}
					onFavoriteToggle={onFavoriteToggle}
					isLiked={isLiked}
					onLikeToggle={onLikeToggle}
					isDisliked={isDisliked}
					onDislikeToggle={onDislikeToggle}
					showDetailLink={showDetailLink}
					onDetailClick={onDetailClick}
					onPopoverClose={onPopoverClose}
				/>
			</div>
		</div>
	);
}

/**
 * プール化対応音声ボタンコンポーネント
 */
export function AudioButton({
	audioButton,
	onPlay,
	className,
	maxTitleLength = 30,
	showDetailLink = false,
	onDetailClick,
	isFavorite = false,
	onFavoriteToggle,
	isLiked = false,
	onLikeToggle,
	isDisliked = false,
	onDislikeToggle,
	searchQuery,
	highlightClassName,
	isAuthenticated = false,
}: AudioButtonProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [progress, setProgress] = useState(0);
	const audioPlayerRef = useRef<AudioControls>(null);

	// 時間の計算
	const duration = (audioButton.endTime || audioButton.startTime) - audioButton.startTime;
	const youtubeUrl = `https://www.youtube.com/watch?v=${audioButton.videoId}&t=${Math.floor(audioButton.startTime)}s`;

	// タイトルの省略
	const displayTitle =
		audioButton.buttonText.length > maxTitleLength
			? `${audioButton.buttonText.slice(0, maxTitleLength)}...`
			: audioButton.buttonText;

	const handlePlayClick = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();

			if (isPlaying) {
				audioPlayerRef.current?.pause();
			} else {
				// 再生開始までの読み込み中はスピナーを出す（onPlay=handlePlayStart で解除）。
				// 以前は setIsLoading(true) の経路が無くスピナーが不達だった（SPR-200）。
				setIsLoading(true);
				audioPlayerRef.current?.play();
			}
		},
		[isPlaying],
	);

	const handlePlayStart = useCallback(() => {
		setIsPlaying(true);
		setIsLoading(false);
		onPlay?.();
	}, [onPlay]);

	const handlePlayPause = useCallback(() => {
		setIsPlaying(false);
		setIsLoading(false);
		setProgress(0);
	}, []);

	const handlePlayEnd = useCallback(() => {
		setIsPlaying(false);
		setIsLoading(false);
		setProgress(0);
	}, []);

	return (
		<>
			{/* プール化された音声プレイヤー（DOM要素なし） */}
			<AudioPlayer
				ref={audioPlayerRef}
				audioButton={audioButton}
				onPlay={handlePlayStart}
				onPause={handlePlayPause}
				onEnd={handlePlayEnd}
				onProgress={setProgress}
			/>

			{/* UI要素 */}
			<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
				<div
					className={cn(
						"group relative inline-flex max-w-full items-stretch overflow-hidden rounded-xl border-[1.5px] border-minase-300 bg-minase-50",
						"transition-[border-color,background-color,box-shadow,transform] duration-150",
						"hover:border-minase-500 hover:shadow-[0_2px_8px_hsl(var(--minase-500)/0.18)]",
						"has-[:active]:scale-[0.98]",
						isPlaying && "border-minase-600",
						className,
					)}
				>
					{/* 進捗フィル */}
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-minase-200 transition-[width] duration-150 ease-linear"
						style={{ width: `${progress}%` }}
					/>

					{/* メイン部分 - 再生専用エリア */}
					<button
						type="button"
						onClick={handlePlayClick}
						disabled={isLoading}
						className="relative z-10 flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-2 px-2.5 py-1.5 hover:bg-minase-100/70 transition-colors"
						aria-label={isPlaying ? "一時停止" : "再生"}
					>
						{/* 再生アイコン */}
						<div
							className={cn(
								"flex h-8 w-8 flex-none items-center justify-center rounded-full bg-minase-500 text-white transition-colors",
								isPlaying && "bg-minase-600",
							)}
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : isPlaying ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4 translate-x-0.5" />
							)}
						</div>

						{/* タイトル */}
						<span
							className="truncate font-bold text-sm text-minase-950"
							title={audioButton.buttonText}
						>
							{searchQuery ? (
								<HighlightText
									text={displayTitle}
									searchQuery={searchQuery}
									highlightClassName={
										highlightClassName || "bg-primary/20 text-foreground px-1 rounded"
									}
								/>
							) : (
								displayTitle
							)}
						</span>
					</button>

					{/* 詳細表示ボタン - Popover専用エリア */}
					<PopoverTrigger asChild>
						<button
							type="button"
							className="relative z-10 flex min-h-[44px] min-w-[44px] flex-none items-center justify-center border-l border-minase-200 text-minase-600 transition-colors hover:bg-minase-100 hover:text-minase-700"
							aria-label="詳細を表示"
						>
							<MoreHorizontal className="h-4 w-4" />
						</button>
					</PopoverTrigger>
				</div>

				<PopoverContent
					className="w-[min(320px,calc(100vw-24px))] p-0 border-minase-200"
					align="start"
					aria-label={`${audioButton.buttonText} の詳細`}
				>
					<AudioButtonPopoverContent
						audioButton={audioButton}
						duration={duration}
						youtubeUrl={youtubeUrl}
						isFavorite={isFavorite}
						onFavoriteToggle={onFavoriteToggle}
						isLiked={isLiked}
						onLikeToggle={onLikeToggle}
						isDisliked={isDisliked}
						onDislikeToggle={onDislikeToggle}
						showDetailLink={showDetailLink}
						onDetailClick={onDetailClick}
						onPopoverClose={() => setIsPopoverOpen(false)}
						searchQuery={searchQuery}
						highlightClassName={highlightClassName}
						isAuthenticated={isAuthenticated}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}
