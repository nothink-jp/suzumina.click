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
import { Clock, ExternalLink, Heart, Info, Loader2, Pause, Play, User, Video } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { type AudioControls, AudioPlayer } from "./audio-player";
import { HighlightText } from "./highlight-text";

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
	// ハイライト関連
	searchQuery?: string;
	highlightClassName?: string;
}

interface AudioButtonPopoverContentProps {
	audioButton: FrontendAudioButtonData;
	duration: number;
	youtubeUrl: string;
	isFavorite: boolean;
	onFavoriteToggle?: () => void;
	showDetailLink: boolean;
	onDetailClick?: () => void;
	onPopoverClose: () => void;
	searchQuery?: string;
	highlightClassName?: string;
}

function AudioButtonPopoverContent({
	audioButton,
	duration,
	youtubeUrl,
	isFavorite,
	onFavoriteToggle,
	showDetailLink,
	onDetailClick,
	onPopoverClose,
	searchQuery,
	highlightClassName,
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
					<span>{duration}秒</span>
				</div>
				<div className="flex items-center gap-2">
					<User className="h-4 w-4" />
					<span>{audioButton.createdByName}</span>
				</div>
				<div className="flex items-center gap-2">
					<Video className="h-4 w-4" />
					<span className="text-xs">再生: {audioButton.playCount}回</span>
				</div>
			</div>

			{/* タグ */}
			{audioButton.tags && audioButton.tags.length > 0 && (
				<div>
					<p className="text-xs text-muted-foreground mb-2">タグ</p>
					<div className="flex flex-wrap gap-1">
						{audioButton.tags.map((tag, index) => (
							<span
								key={index}
								className="inline-block bg-suzuka-100 text-suzuka-700 text-xs px-2 py-1 rounded-full"
							>
								{searchQuery ? (
									<HighlightText
										text={tag}
										searchQuery={searchQuery}
										highlightClassName={
											highlightClassName || "bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
										}
									/>
								) : (
									tag
								)}
							</span>
						))}
					</div>
				</div>
			)}

			{/* アクションボタン */}
			<div className="flex gap-2 pt-2">
				{onFavoriteToggle && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onFavoriteToggle();
						}}
						className={cn(
							"flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1",
							isFavorite
								? "bg-red-100 text-red-700 hover:bg-red-200"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200",
						)}
					>
						<Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
						{isFavorite ? "お気に入り解除" : "お気に入り"}
					</button>
				)}

				{showDetailLink && onDetailClick && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDetailClick();
							onPopoverClose();
						}}
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-suzuka-100 text-suzuka-700 hover:bg-suzuka-200 transition-colors flex-1"
					>
						<ExternalLink className="h-4 w-4" />
						詳細
					</button>
				)}

				<a
					href={youtubeUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					<Video className="h-4 w-4" />
					YouTube
				</a>
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
	searchQuery,
	highlightClassName,
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
						showDetailLink={showDetailLink}
						onDetailClick={onDetailClick}
						onPopoverClose={() => setIsPopoverOpen(false)}
						searchQuery={searchQuery}
						highlightClassName={highlightClassName}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}
