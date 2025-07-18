/**
 * プール化対応 AudioButton コンポーネント
 *
 * 変更点:
 * - SimpleAudioButton → AudioButton（命名統一）
 * - AudioOnlyPlayer → AudioPlayer（プール化対応）
 * - パフォーマンス最適化
 */

"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import {
	Clock,
	ExternalLink,
	Heart,
	Info,
	Loader2,
	Pause,
	Play,
	ThumbsDown,
	ThumbsUp,
	User,
	Video,
	Youtube,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { type AudioControls, AudioPlayer } from "./audio-player";
import { HighlightText } from "./highlight-text";
import { TagList } from "./tag-list";

interface AudioButtonProps {
	audioButton: FrontendAudioButtonData;
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
	audioButton: FrontendAudioButtonData;
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
		<div className="w-80 p-4 space-y-4">
			{/* タイトル */}
			<div>
				<h4 className="font-semibold text-base text-foreground leading-tight">
					{searchQuery ? (
						<HighlightText
							text={audioButton.title}
							searchQuery={searchQuery}
							highlightClassName={
								highlightClassName || "bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
							}
						/>
					) : (
						audioButton.title
					)}
				</h4>
				{audioButton.description && (
					<p className="text-sm text-muted-foreground mt-1 leading-relaxed">
						{searchQuery ? (
							<HighlightText
								text={audioButton.description}
								searchQuery={searchQuery}
								highlightClassName={
									highlightClassName || "bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
								}
							/>
						) : (
							audioButton.description
						)}
					</p>
				)}
			</div>

			{/* メタデータ */}
			<div className="space-y-2 text-sm text-muted-foreground">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4" />
					<span>{duration.toFixed(1)}秒</span>
				</div>
				<div className="flex items-center gap-2">
					<User className="h-4 w-4" />
					<a
						href={`/users/${audioButton.createdBy}`}
						className="text-suzuka-600 hover:text-suzuka-700 hover:underline transition-colors"
						onClick={(e) => e.stopPropagation()}
					>
						{audioButton.createdByName}
					</a>
				</div>
				<div className="flex items-center gap-2">
					<Video className="h-4 w-4" />
					<span className="text-xs">再生: {audioButton.playCount}回</span>
				</div>
				{audioButton.sourceVideoTitle && (
					<div className="flex items-center gap-2">
						<Video className="h-4 w-4" />
						<a
							href={`/videos/${audioButton.sourceVideoId}`}
							className="text-suzuka-600 hover:text-suzuka-700 hover:underline transition-colors text-xs truncate"
							onClick={(e: React.MouseEvent) => e.stopPropagation()}
							title={audioButton.sourceVideoTitle}
						>
							{audioButton.sourceVideoTitle}
						</a>
					</div>
				)}
			</div>

			{/* タグ */}
			{audioButton.tags && audioButton.tags.length > 0 && (
				<div>
					<p className="text-xs text-muted-foreground mb-2">タグ</p>
					<TagList
						tags={audioButton.tags}
						variant="outline"
						showIcon={true}
						searchQuery={searchQuery}
						highlightClassName={
							highlightClassName || "bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
						}
						size="default"
					/>
				</div>
			)}

			{/* アクションボタン */}
			<div className="flex gap-2 pt-2 items-center">
				{/* お気に入りボタン */}
				{onFavoriteToggle && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (isAuthenticated) {
								onFavoriteToggle();
							}
						}}
						aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
						disabled={!isAuthenticated}
						title={!isAuthenticated ? "お気に入りするにはログインが必要です" : undefined}
						className={cn(
							"flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
							isFavorite && "text-red-600",
							!isAuthenticated && "opacity-50 cursor-not-allowed hover:bg-background",
						)}
					>
						<Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
					</button>
				)}

				{/* 高評価・低評価ボタングループ */}
				{onLikeToggle && (
					<div className="flex rounded-md border border-input">
						{/* 高評価ボタン */}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (isAuthenticated) {
									onLikeToggle();
								}
							}}
							disabled={!isAuthenticated}
							title={!isAuthenticated ? "高評価するにはログインが必要です" : undefined}
							className={cn(
								"flex items-center gap-1 px-3 py-2 text-sm font-medium border-0 rounded-l-md rounded-r-none border-r border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
								isLiked && "text-red-600",
								!isAuthenticated && "opacity-50 cursor-not-allowed hover:bg-background",
							)}
						>
							<ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
							<span>{audioButton.likeCount}</span>
						</button>

						{/* 低評価ボタン（YouTube方式：集計数は非表示） */}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (isAuthenticated) {
									onDislikeToggle?.();
								}
							}}
							disabled={!isAuthenticated}
							title={
								!isAuthenticated
									? "低評価するにはログインが必要です"
									: isDisliked
										? "低評価を取り消す"
										: "低評価する"
							}
							className={cn(
								"flex items-center justify-center w-10 h-10 border-0 rounded-r-md rounded-l-none bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
								isDisliked && "text-blue-600",
								!isAuthenticated && "opacity-50 cursor-not-allowed hover:bg-background",
							)}
						>
							<ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
						</button>
					</div>
				)}

				{/* YouTubeボタン */}
				<a
					href={youtubeUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					<Youtube className="h-4 w-4" />
					YouTube
				</a>

				{/* 詳細ページへのアイコンボタン */}
				{showDetailLink && onDetailClick && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDetailClick();
							onPopoverClose();
						}}
						aria-label="詳細ページを開く"
						className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
					>
						<ExternalLink className="h-4 w-4" />
					</button>
				)}
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
	const audioPlayerRef = useRef<AudioControls>(null);

	// 時間の計算
	const duration = audioButton.endTime - audioButton.startTime;
	const youtubeUrl = `https://www.youtube.com/watch?v=${audioButton.sourceVideoId}&t=${Math.floor(audioButton.startTime)}s`;

	// タイトルの省略
	const displayTitle =
		audioButton.title.length > maxTitleLength
			? `${audioButton.title.slice(0, maxTitleLength)}...`
			: audioButton.title;

	const handlePlayClick = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();

			if (isPlaying) {
				audioPlayerRef.current?.pause();
			} else {
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
	}, []);

	const handlePlayEnd = useCallback(() => {
		setIsPlaying(false);
		setIsLoading(false);
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
			/>

			{/* UI要素 */}
			<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
				<div
					className={cn(
						"group relative inline-flex items-stretch rounded-lg overflow-hidden shadow-sm",
						"bg-gradient-to-r from-minase-400 to-minase-500 hover:from-minase-500 hover:to-minase-600",
						"transition-all duration-200",
						className,
					)}
				>
					{/* メイン部分 - 再生専用エリア */}
					<button
						type="button"
						onClick={handlePlayClick}
						disabled={isLoading}
						className="flex items-center gap-2 px-3 py-2 text-white min-h-[44px] flex-1 min-w-0 cursor-pointer hover:bg-black/10 transition-colors"
						aria-label={isPlaying ? "一時停止" : "再生"}
					>
						{/* 再生アイコン */}
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : isPlaying ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4 translate-x-0.5" />
							)}
						</div>

						{/* タイトル */}
						<span className="font-medium text-sm truncate" title={audioButton.title}>
							{searchQuery ? (
								<HighlightText
									text={displayTitle}
									searchQuery={searchQuery}
									highlightClassName={
										highlightClassName || "bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
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
							className="flex items-center justify-center px-3 py-2 min-h-[44px] min-w-[44px] bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
							aria-label="詳細を表示"
						>
							<Info className="h-4 w-4" />
						</button>
					</PopoverTrigger>
				</div>

				<PopoverContent className="w-80 p-0 border-suzuka-200" align="start">
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
