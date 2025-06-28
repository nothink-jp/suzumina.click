"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import { ExternalLink, Heart, Info, Loader2, Pause, Play, Trash2 } from "lucide-react";
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
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all group-hover:bg-white/30">
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
						className="flex items-center justify-center px-3 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors border-l border-white/20"
						aria-label="詳細情報を表示"
					>
						<Info className="h-4 w-4" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-64 p-2" align="end">
					<div className="space-y-1">
						{/* アクションボタン */}
						{onFavoriteToggle && (
							<button
								type="button"
								onClick={() => {
									onFavoriteToggle();
									setShowInfo(false);
								}}
								className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
							>
								<Heart className={cn("h-4 w-4", isFavorite && "fill-current text-red-500")} />
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
								className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
							>
								<Info className="h-4 w-4" />
								<span>詳細を見る</span>
							</button>
						)}

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
									className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-4 w-4" />
									<span>削除</span>
								</button>
							</>
						)}

						{/* 情報セクション */}
						<div className="my-1 h-px bg-border" />

						<div className="px-3 py-2">
							<div className="space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground">元動画:</span>
									<p className="font-medium truncate">{audioButton.sourceVideoTitle}</p>
								</div>
								<div className="flex gap-4">
									<div>
										<span className="text-muted-foreground">長さ:</span>
										<span className="ml-1 font-medium">{Math.floor(duration)}秒</span>
									</div>
									<div>
										<span className="text-muted-foreground">再生:</span>
										<span className="ml-1 font-medium">
											{audioButton.playCount.toLocaleString()}回
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="my-1 h-px bg-border" />

						{/* 外部リンク */}
						<a
							href={`/videos/${audioButton.sourceVideoId}`}
							className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
						>
							<svg
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="リンク"
							>
								<title>リンク</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								/>
							</svg>
							<span>動画詳細ページ</span>
						</a>

						<a
							href={youtubeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
						>
							<ExternalLink className="h-4 w-4" />
							<span>YouTubeで開く</span>
						</a>
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
