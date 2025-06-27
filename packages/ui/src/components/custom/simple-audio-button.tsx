"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Info, Loader2, Pause, Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AudioOnlyPlayer } from "./audio-only-player";

interface SimpleAudioButtonProps {
	audioButton: FrontendAudioButtonData;
	onPlay?: () => void;
	className?: string;
	maxTitleLength?: number;
}

export function SimpleAudioButton({
	audioButton,
	onPlay,
	className,
	maxTitleLength = 100,
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
				"group relative flex items-center gap-2 rounded-lg border bg-card p-3 transition-all hover:shadow-md",
				className,
			)}
		>
			{/* メインボタンエリア */}
			<button
				type="button"
				onClick={handlePlay}
				className="flex flex-1 items-center gap-3 text-left transition-colors hover:text-suzuka-500"
				aria-label={`${audioButton.title}を再生`}
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-suzuka-100 text-suzuka-600 transition-all group-hover:bg-suzuka-200">
					{isLoading ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : isPlaying ? (
						<Pause className="h-5 w-5" />
					) : (
						<Play className="h-5 w-5 translate-x-0.5" />
					)}
				</div>
				<span className="font-medium truncate flex-1 min-w-0" title={audioButton.title}>
					{truncatedTitle}
				</span>
			</button>

			{/* 情報アイコン */}
			<Popover open={showInfo} onOpenChange={setShowInfo}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
						aria-label="詳細情報を表示"
					>
						<Info className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80" align="end">
					<div className="space-y-3">
						<div>
							<h4 className="mb-1 text-sm font-medium">元動画</h4>
							<p className="text-sm text-muted-foreground">{audioButton.sourceVideoTitle}</p>
						</div>

						<div>
							<h4 className="mb-1 text-sm font-medium">長さ</h4>
							<p className="text-sm text-muted-foreground">{Math.floor(duration)}秒</p>
						</div>

						<div>
							<h4 className="mb-1 text-sm font-medium">再生回数</h4>
							<p className="text-sm text-muted-foreground">
								{audioButton.playCount.toLocaleString()}回
							</p>
						</div>

						<div className="pt-2 space-y-2">
							<a
								href={`/videos/${audioButton.sourceVideoId}`}
								className="inline-flex items-center text-sm text-suzuka-600 hover:underline"
							>
								動画詳細ページ
								<svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<title>内部リンク</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 7l5 5m0 0l-5 5m5-5H6"
									/>
								</svg>
							</a>
							<br />
							<a
								href={youtubeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center text-sm text-suzuka-600 hover:underline"
							>
								YouTubeで開く
								<svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<title>外部リンク</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
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
