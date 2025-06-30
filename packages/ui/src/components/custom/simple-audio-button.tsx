"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import {
	Calendar,
	Clock,
	ExternalLink,
	Heart,
	Info,
	Loader2,
	Pause,
	Play,
	Tag,
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
				<PopoverContent className="w-80 p-0" align="end">
					<div className="p-4 space-y-4">
						{/* ヘッダー: タイトル */}
						<div>
							<h3 className="font-semibold text-lg text-foreground mb-2 leading-tight">
								{audioButton.title}
							</h3>
							{audioButton.description && (
								<p className="text-sm text-muted-foreground mb-3">{audioButton.description}</p>
							)}
						</div>

						{/* タグ */}
						{audioButton.tags && audioButton.tags.length > 0 && (
							<div>
								<h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
									<Tag className="h-4 w-4" />
									タグ
								</h4>
								<div className="flex flex-wrap gap-1">
									{audioButton.tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-minase-100 text-minase-700 border border-minase-200"
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						)}

						{/* 統計情報 */}
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
								<Play className="h-5 w-5 text-minase-600" />
								<div>
									<div className="text-sm font-medium text-foreground">再生回数</div>
									<div className="text-lg font-bold text-minase-600">
										{audioButton.playCount.toLocaleString()}回
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
								<Clock className="h-5 w-5 text-minase-600" />
								<div>
									<div className="text-sm font-medium text-foreground">長さ</div>
									<div className="text-lg font-bold text-minase-600">{Math.floor(duration)}秒</div>
								</div>
							</div>
						</div>

						{/* 作成者・作成日 */}
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm">
								<User className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">作成者</span>
								<span className="font-medium text-minase-600">{audioButton.createdByName}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">作成日</span>
								<span className="font-medium">{audioButton.relativeTimeText}</span>
							</div>
						</div>

						{/* 元動画 */}
						<div>
							<div className="flex items-center gap-2 text-sm mb-2">
								<Video className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">元動画</span>
							</div>
							<p className="font-medium text-sm text-minase-600 leading-tight">
								{audioButton.sourceVideoTitle || "動画タイトル取得中..."}
							</p>
						</div>

						{/* アクションボタン */}
						<div className="pt-2 border-t border-border space-y-1">
							{onFavoriteToggle && (
								<button
									type="button"
									onClick={() => {
										onFavoriteToggle();
										setShowInfo(false);
									}}
									className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
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
									className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
								>
									<Info className="h-4 w-4" />
									<span>詳細を見る</span>
								</button>
							)}

							<a
								href={`/videos/${audioButton.sourceVideoId}`}
								className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
								onClick={() => setShowInfo(false)}
							>
								<Video className="h-4 w-4" />
								<span>動画詳細ページ</span>
							</a>

							<a
								href={youtubeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
								onClick={() => setShowInfo(false)}
							>
								<ExternalLink className="h-4 w-4" />
								<span>YouTubeで開く</span>
							</a>

							{/* 削除ボタン */}
							{canDelete && onDelete && (
								<>
									<div className="my-2 h-px bg-border" />
									<button
										type="button"
										onClick={() => {
											if (window.confirm("この音声ボタンを削除しますか？")) {
												onDelete();
												setShowInfo(false);
											}
										}}
										className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
									>
										<Trash2 className="h-4 w-4" />
										<span>削除</span>
									</button>
								</>
							)}
						</div>

						{/* 詳細を見るボタン（v0モック準拠） */}
						{showDetailLink && onDetailClick && (
							<button
								type="button"
								onClick={() => {
									onDetailClick();
									setShowInfo(false);
								}}
								className="w-full mt-4 px-4 py-2 border border-minase-300 text-minase-600 rounded-md hover:bg-minase-50 transition-colors font-medium"
							>
								詳細を見る
							</button>
						)}
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
