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
	Trash2,
	User,
	Video,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AudioOnlyPlayer } from "./audio-only-player";

interface SimpleAudioButtonProps {
	audioButton: FrontendAudioButtonData;
	onPlay?: () => void;
	className?: string;
	maxTitleLength?: number;
	showDetailLink?: boolean;
	onDetailClick?: () => void;
	// お気に入り関連
	isFavorite?: boolean;
	onFavoriteToggle?: () => void;
	// 削除関連
	canDelete?: boolean;
	onDelete?: () => void;
}

export function SimpleAudioButton({
	audioButton,
	onPlay,
	className,
	maxTitleLength = 100,
	showDetailLink = false,
	onDetailClick,
	isFavorite = false,
	onFavoriteToggle,
	canDelete = false,
	onDelete,
}: SimpleAudioButtonProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [showInfo, setShowInfo] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isPlayerReady, setIsPlayerReady] = useState(false);
	const audioPlayerRef = useRef<HTMLDivElement>(null);

	const handlePlay = useCallback(() => {
		if (!isPlayerReady) {
			return;
		}

		// audioControlsプロパティへの安全なアクセス
		const audioControls = (
			audioPlayerRef.current as HTMLDivElement & {
				audioControls?: {
					play: () => void;
					pause: () => void;
					stop: () => void;
					setVolume: (vol: number) => void;
					isPlaying: boolean;
					isReady: boolean;
				};
			}
		)?.audioControls;
		if (!audioControls) {
			return;
		}

		if (isPlaying) {
			audioControls.pause();
		} else {
			audioControls.play();
		}
	}, [isPlaying, isPlayerReady]);

	const handlePlayerReady = useCallback(() => {
		setIsPlayerReady(true);
		setIsLoading(false);
	}, []);

	const handlePlayerPlay = useCallback(() => {
		setIsPlaying(true);
		onPlay?.();
	}, [onPlay]);

	const handlePlayerPause = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const handlePlayerEnd = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const handlePlayerError = useCallback((_error: number) => {
		if (process.env.NODE_ENV === "development") {
			// console.error("Audio playback error:", error);
		}
		setIsPlaying(false);
		setIsLoading(false);
	}, []);

	const duration = audioButton.endTime - audioButton.startTime;

	const youtubeUrl = `https://www.youtube.com/watch?v=${audioButton.sourceVideoId}&t=${Math.floor(audioButton.startTime)}`;

	// タイトルの文字数制限処理
	const truncatedTitle =
		audioButton.title.length > maxTitleLength
			? `${audioButton.title.slice(0, maxTitleLength)}...`
			: audioButton.title;

	return (
		<div
			className={cn(
				"group relative inline-flex items-stretch rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all",
				"bg-gradient-to-r from-minase-400 to-minase-500",
				className,
			)}
		>
			{/* メインボタンエリア */}
			<button
				type="button"
				onClick={handlePlay}
				className="flex items-center gap-2 text-left px-3 py-2 text-white transition-all hover:from-minase-500 hover:to-minase-600"
				aria-label={`${audioButton.title}を再生`}
			>
				<div className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all group-hover:bg-white/30">
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : isPlaying ? (
						<Pause className="h-4 w-4" />
					) : (
						<Play className="h-4 w-4 translate-x-0.5" />
					)}
				</div>
				<span className="font-medium whitespace-nowrap" title={audioButton.title}>
					{truncatedTitle}
				</span>
			</button>

			{/* 情報ボタンエリア */}
			<Popover open={showInfo} onOpenChange={setShowInfo}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className="flex items-center justify-center px-3 py-2 min-h-[44px] min-w-[44px] bg-white/10 text-white hover:bg-white/20 transition-colors border-l border-white/20"
						aria-label="詳細情報を表示"
					>
						<Info className="h-4 w-4" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-72 sm:w-80 p-0" align="end">
					<div className="p-3 space-y-3">
						{/* ヘッダー: タイトル */}
						<div>
							<h3 className="font-semibold text-base text-foreground mb-1 leading-tight line-clamp-2">
								{audioButton.title}
							</h3>
							{audioButton.description && (
								<p className="text-xs text-muted-foreground mb-2 line-clamp-2">
									{audioButton.description}
								</p>
							)}
						</div>

						{/* タグ */}
						{audioButton.tags && audioButton.tags.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{audioButton.tags.slice(0, 3).map((tag: string) => (
									<span
										key={tag}
										className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-minase-100 text-minase-700"
									>
										{tag}
									</span>
								))}
								{audioButton.tags.length > 3 && (
									<span className="text-xs text-muted-foreground">
										+{audioButton.tags.length - 3}
									</span>
								)}
							</div>
						)}

						{/* 統計情報とメタデータ */}
						<div className="bg-muted/20 rounded-md p-2 space-y-1">
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-1">
									<Play className="h-3 w-3 text-minase-600" />
									<span className="font-medium">
										{audioButton.playCount.toLocaleString()}回再生
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Clock className="h-3 w-3 text-minase-600" />
									<span className="font-medium">{Math.floor(duration)}秒</span>
								</div>
							</div>
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<div className="flex items-center gap-1">
									<User className="h-3 w-3" />
									<span className="truncate max-w-20">{audioButton.createdByName}</span>
								</div>
								<span>{audioButton.relativeTimeText}</span>
							</div>
						</div>

						{/* 元動画 */}
						<div className="text-xs">
							<div className="flex items-center gap-1 mb-1">
								<Video className="h-3 w-3 text-muted-foreground" />
								<span className="text-muted-foreground">元動画</span>
							</div>
							<p className="font-medium text-minase-600 leading-tight line-clamp-2">
								{audioButton.sourceVideoTitle || "動画タイトル取得中..."}
							</p>
						</div>

						{/* アクションボタン */}
						<div className="pt-2 border-t border-border space-y-0.5">
							{onFavoriteToggle && (
								<button
									type="button"
									onClick={() => {
										onFavoriteToggle();
										setShowInfo(false);
									}}
									className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
								>
									<Heart className={cn("h-3 w-3", isFavorite && "fill-current text-red-500")} />
									<span>{isFavorite ? "お気に入りから削除" : "お気に入りに追加"}</span>
								</button>
							)}

							{/* 詳細ページへのリンク */}
							{showDetailLink && onDetailClick && (
								<button
									type="button"
									onClick={() => {
										onDetailClick();
										setShowInfo(false);
									}}
									className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
								>
									<Info className="h-3 w-3" />
									<span>詳細を見る</span>
								</button>
							)}

							<a
								href={`/videos/${audioButton.sourceVideoId}`}
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
								onClick={() => setShowInfo(false)}
							>
								<Video className="h-3 w-3" />
								<span>動画詳細ページ</span>
							</a>

							<a
								href={youtubeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
								onClick={() => setShowInfo(false)}
							>
								<ExternalLink className="h-3 w-3" />
								<span>YouTubeで開く</span>
							</a>

							{/* 削除ボタン */}
							{canDelete && onDelete && (
								<>
									<div className="my-1 h-px bg-border" />
									<button
										type="button"
										onClick={() => {
											if (window.confirm("この音声ボタンを削除しますか？")) {
												onDelete();
												setShowInfo(false);
											}
										}}
										className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
									>
										<Trash2 className="h-3 w-3" />
										<span>削除</span>
									</button>
								</>
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{/* 音声のみ再生プレイヤー（非表示） */}
			<AudioOnlyPlayer
				ref={audioPlayerRef}
				videoId={audioButton.sourceVideoId}
				startTime={audioButton.startTime}
				endTime={audioButton.endTime}
				onReady={handlePlayerReady}
				onPlay={handlePlayerPlay}
				onPause={handlePlayerPause}
				onEnd={handlePlayerEnd}
				onError={handlePlayerError}
			/>
		</div>
	);
}
