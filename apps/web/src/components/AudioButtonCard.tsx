"use client";

import {
	type FrontendAudioButtonData,
	formatTimestamp,
	getAudioButtonCategoryLabel,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Clock, ExternalLink, Heart, Pause, Play, Share2, Tag } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { decrementLikeCount, incrementLikeCount, incrementPlayCount } from "@/app/buttons/actions";
import { useYouTubePlayer, YouTubePlayer, type YTPlayer } from "./YouTubePlayer";

/**
 * AudioButtonCard component props
 */
export interface AudioButtonCardProps {
	/** 音声ボタンデータ */
	audioButton: FrontendAudioButtonData;
	/** サイズバリアント */
	size?: "sm" | "md" | "lg";
	/** 表示バリアント */
	variant?: "default" | "compact" | "detailed";
	/** 元動画の表示 */
	showSourceVideo?: boolean;
	/** 詳細表示 */
	showDescription?: boolean;
	/** 統計表示 */
	showStats?: boolean;
	/** インタラクション可能 */
	interactive?: boolean;
	/** プレビューモード（作成時のプレビュー） */
	isPreview?: boolean;
	/** クリック時のコールバック */
	onClick?: (audioButton: FrontendAudioButtonData) => void;
	/** クラス名 */
	className?: string;
}

/**
 * AudioButtonCard Component
 *
 * タイムスタンプ参照システムによる音声ボタンカード
 */
export function AudioButtonCard({
	audioButton,
	size = "md",
	variant = "default",
	showSourceVideo = true,
	showDescription = true,
	showStats = true,
	interactive = true,
	isPreview = false,
	onClick,
	className = "",
}: AudioButtonCardProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [hasViewed, setHasViewed] = useState(false);
	const [liked, setLiked] = useState(false);
	const [localStats, setLocalStats] = useState({
		playCount: audioButton.playCount,
		likeCount: audioButton.likeCount,
	});

	const { handlers } = useYouTubePlayer();

	// YouTube URLを生成
	const youtubeUrl = `https://www.youtube.com/watch?v=${audioButton.sourceVideoId}&t=${audioButton.startTime}s`;

	// カード表示時の処理
	const handleCardView = useCallback(async () => {
		if (!hasViewed && !isPreview) {
			setHasViewed(true);
		}
	}, [hasViewed, isPreview]);

	// 再生ボタンクリック処理
	const handlePlayClick = useCallback(async () => {
		if (!interactive) {
			return;
		}

		try {
			if (!isDialogOpen) {
				setIsDialogOpen(true);
			}

			// 再生統計を更新（プレビューモードでは無効）
			if (!isPlaying && !isPreview) {
				await incrementPlayCount(audioButton.id);
				setLocalStats((prev) => ({ ...prev, playCount: prev.playCount + 1 }));
			}

			setIsPlaying(!isPlaying);
			onClick?.(audioButton);
			handleCardView();
		} catch (_error) {
			// 再生・インタラクションエラーは無視してカード表示を継続
		}
	}, [interactive, isDialogOpen, isPlaying, isPreview, audioButton, onClick, handleCardView]);

	// いいね処理
	const handleLikeClick = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();
			if (!interactive || isPreview) {
				return;
			}

			try {
				if (liked) {
					await decrementLikeCount(audioButton.id);
					setLocalStats((prev) => ({ ...prev, likeCount: prev.likeCount - 1 }));
					setLiked(false);
				} else {
					await incrementLikeCount(audioButton.id);
					setLocalStats((prev) => ({ ...prev, likeCount: prev.likeCount + 1 }));
					setLiked(true);
				}
			} catch (_error) {
				// 表示回数更新エラーは無視してカード表示を継続
			}
		},
		[interactive, isPreview, liked, audioButton.id],
	);

	// 共有処理
	const handleShareClick = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();

			if (navigator.share) {
				try {
					await navigator.share({
						title: audioButton.title,
						text: audioButton.description || `「${audioButton.title}」の音声ボタン`,
						url: youtubeUrl,
					});
				} catch (error) {
					if ((error as Error).name !== "AbortError") {
						// AbortError以外のシェアエラーはログで記録予定
					}
				}
			} else {
				// フォールバック: クリップボードにコピー
				try {
					await navigator.clipboard.writeText(youtubeUrl);
				} catch (_error) {
					// クリップボードアクセスエラーは無視してシェア機能を継続
				}
			}
		},
		[audioButton, youtubeUrl],
	);

	// プレイヤーの制御
	const handlePlayerReady = useCallback(
		(playerInstance: YTPlayer) => {
			handlers.onReady(playerInstance);

			// デバッグログ
			// biome-ignore lint/suspicious/noConsole: Debug logging for audio button playback
			console.log("Audio Button Player Ready:", {
				buttonId: audioButton.id,
				videoId: audioButton.sourceVideoId,
				startTime: audioButton.startTime,
				endTime: audioButton.endTime,
				title: audioButton.title,
			});

			// 指定範囲に自動シーク
			if (audioButton.startTime > 0) {
				playerInstance.seekTo(audioButton.startTime);
			}
		},
		[
			audioButton.startTime,
			audioButton.endTime,
			audioButton.id,
			audioButton.sourceVideoId,
			audioButton.title,
			handlers.onReady,
		],
	);

	// YouTube Player state names mapping
	const getStateName = useCallback((state: number): string => {
		const stateMap: Record<number, string> = {
			[-1]: "UNSTARTED",
			[0]: "ENDED",
			[1]: "PLAYING",
			[2]: "PAUSED",
			[3]: "BUFFERING",
			[5]: "CUED",
		};
		return stateMap[state] || "UNKNOWN";
	}, []);

	const handlePlayerStateChange = useCallback(
		(state: number) => {
			handlers.onStateChange(state);

			// デバッグログ
			// biome-ignore lint/suspicious/noConsole: Debug logging for audio button playback
			console.log("Audio Button Player State Change:", {
				buttonId: audioButton.id,
				state,
				stateName: getStateName(state),
			});

			// YouTube Player API の built-in end parameter を使用するため、
			// カスタムの終了時間チェックは不要
			// endTime は YouTubePlayer コンポーネントで playerVars.end として設定済み
		},
		[audioButton.id, handlers.onStateChange, getStateName],
	);

	// サイズとバリアントに基づくスタイル
	const getCardStyles = () => {
		const baseStyles = "transition-all duration-200 hover:shadow-md";

		const sizeStyles = {
			sm: "p-3",
			md: "p-4",
			lg: "p-6",
		};

		const variantStyles = {
			default: "border border-border",
			compact: "border border-border",
			detailed: "border border-border shadow-sm",
		};

		return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
	};

	const getTitleSize = () => {
		const sizeMap = {
			sm: "text-sm font-medium",
			md: "text-base font-medium",
			lg: "text-lg font-semibold",
		};
		return sizeMap[size];
	};

	return (
		<Card className={getCardStyles()} onClick={handleCardView}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<CardTitle className={`${getTitleSize()} truncate`}>{audioButton.title}</CardTitle>
						{showDescription && audioButton.description && variant !== "compact" && (
							<CardDescription className="mt-1 text-sm line-clamp-2">
								{audioButton.description}
							</CardDescription>
						)}
					</div>
					<Badge variant="secondary" className="ml-2 shrink-0">
						{getAudioButtonCategoryLabel(audioButton.category)}
					</Badge>
				</div>

				{/* タグ表示 */}
				{audioButton.tags && audioButton.tags.length > 0 && variant !== "compact" && (
					<div className="flex flex-wrap gap-1 mt-2">
						{audioButton.tags.slice(0, 3).map((tag) => (
							<Badge key={tag} variant="outline" className="text-xs">
								<Tag className="h-2 w-2 mr-1" />
								{tag}
							</Badge>
						))}
						{audioButton.tags.length > 3 && (
							<Badge variant="outline" className="text-xs">
								+{audioButton.tags.length - 3}
							</Badge>
						)}
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				{/* 再生ボタンエリア */}
				<div className="flex items-center gap-3">
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button
								size={size === "sm" ? "sm" : "default"}
								className="flex-1"
								onClick={handlePlayClick}
							>
								{isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
								{isPlaying ? "停止" : "再生"}
								<span className="ml-2 text-xs">{formatTimestamp(audioButton.startTime)}</span>
							</Button>
						</DialogTrigger>

						<DialogContent className="max-w-4xl">
							<DialogHeader>
								<DialogTitle>{audioButton.title}</DialogTitle>
								<DialogDescription>
									{audioButton.sourceVideoTitle} - {formatTimestamp(audioButton.startTime)}
								</DialogDescription>
							</DialogHeader>

							<div className="space-y-4">
								<YouTubePlayer
									videoId={audioButton.sourceVideoId}
									width="100%"
									height="400"
									startTime={audioButton.startTime}
									endTime={audioButton.endTime}
									onReady={handlePlayerReady}
									onStateChange={handlePlayerStateChange}
									onTimeUpdate={handlers.onTimeUpdate}
								/>

								<div className="flex items-center justify-between">
									<div className="text-sm text-muted-foreground">
										再生範囲: {formatTimestamp(audioButton.startTime)} -{" "}
										{formatTimestamp(audioButton.endTime)}（{audioButton.durationText}）
									</div>
									<Button variant="outline" size="sm" asChild>
										<Link href={youtubeUrl} target="_blank">
											<ExternalLink className="h-4 w-4 mr-2" />
											YouTubeで開く
										</Link>
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

					{/* アクションボタン群 */}
					<div className="flex gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={handleLikeClick}
							className={liked ? "bg-red-50 border-red-200" : ""}
						>
							<Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
						</Button>

						<Button variant="outline" size="sm" onClick={handleShareClick}>
							<Share2 className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* 統計情報 */}
				{showStats && (
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<div className="flex items-center gap-4">
							<span className="flex items-center gap-1">
								<Play className="h-3 w-3" />
								{localStats.playCount.toLocaleString()}
							</span>
							<span className="flex items-center gap-1">
								<Heart className="h-3 w-3" />
								{localStats.likeCount.toLocaleString()}
							</span>
						</div>
						<span className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{audioButton.durationText}
						</span>
					</div>
				)}

				{/* 元動画情報 */}
				{showSourceVideo && variant !== "compact" && (
					<div className="border-t pt-3">
						<div className="flex items-center justify-between">
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium truncate">{audioButton.sourceVideoTitle}</p>
							</div>
							<Button variant="ghost" size="sm" asChild>
								<Link href={`/videos/${audioButton.sourceVideoId}`}>
									<ExternalLink className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					</div>
				)}

				{/* 作成日時 */}
				<div className="text-xs text-muted-foreground text-right">
					{new Date(audioButton.createdAt).toLocaleDateString("ja-JP", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * AudioButtonCardSkeleton Component
 *
 * ローディング中に表示するスケルトン
 */
export function AudioButtonCardSkeleton({
	size = "md",
	variant = "default",
}: Pick<AudioButtonCardProps, "size" | "variant">) {
	const getCardStyles = () => {
		const sizeStyles = {
			sm: "p-3",
			md: "p-4",
			lg: "p-6",
		};
		return `animate-pulse ${sizeStyles[size]}`;
	};

	return (
		<Card className={getCardStyles()}>
			<CardHeader className="pb-3">
				<div className="space-y-2">
					<div className="h-5 bg-gray-200 rounded w-3/4" />
					{variant !== "compact" && <div className="h-4 bg-gray-200 rounded w-1/2" />}
				</div>
				{variant !== "compact" && (
					<div className="flex gap-1 mt-2">
						<div className="h-5 bg-gray-200 rounded w-12" />
						<div className="h-5 bg-gray-200 rounded w-16" />
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="h-10 bg-gray-200 rounded" />
				<div className="flex justify-between">
					<div className="flex gap-4">
						<div className="h-4 bg-gray-200 rounded w-8" />
						<div className="h-4 bg-gray-200 rounded w-8" />
						<div className="h-4 bg-gray-200 rounded w-8" />
					</div>
					<div className="h-4 bg-gray-200 rounded w-12" />
				</div>
			</CardContent>
		</Card>
	);
}

export default AudioButtonCard;
