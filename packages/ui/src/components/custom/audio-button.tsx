/**
 * プール化対応 AudioButton コンポーネント（一覧・カルーセル用のコンパクトピル）。
 * ポップオーバー内容は audio-button-popover.tsx（SPR-257 で分離・ピル語彙化）、
 * 再生状態機械は use-audio-playback.ts（SPR-258・PlayHero と共有）が正本。
 */

"use client";

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Loader2, MoreHorizontal, Pause, Play } from "lucide-react";
import { useCallback, useState } from "react";
import { PROGRESS_TICK_MS } from "../../lib/playback-constants";
import { AudioButtonPopoverContent } from "./audio-button-popover";
import { AudioPlayer } from "./audio-player";
import { HighlightText } from "./highlight-text";
import { useAudioPlayback } from "./use-audio-playback";

interface AudioButtonProps {
	audioButton: AudioButtonType;
	onPlay?: () => void;
	className?: string;
	maxTitleLength?: number;
	showDetailLink?: boolean;
	onDetailClick?: () => void;
	// お気に入り関連
	isFavorite?: boolean;
	/**
	 * isAuthenticated=false でも disabled にせず常にクリックで呼び出す（未ログイン注記行は別途表示）。
	 * 呼び出し元が未ログイン時のガード/ログイン誘導（toast 等）を自前で行うこと。
	 */
	onFavoriteToggle?: () => void;
	// いいね関連
	isLiked?: boolean;
	/** onFavoriteToggle と同様、未ログイン時のガードは呼び出し元の責務 */
	onLikeToggle?: () => void;
	// ハイライト関連
	searchQuery?: string;
	highlightClassName?: string;
	// 認証関連
	isAuthenticated?: boolean;
	/** X共有の intent URL。指定時のみポップオーバーに「共有」アクションを表示（組み立ては呼び出し元の責務） */
	xShareUrl?: string;
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
	searchQuery,
	highlightClassName,
	isAuthenticated = false,
	xShareUrl,
}: AudioButtonProps) {
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	// 再生状態機械は useAudioPlayback に一本化（PlayHero と共有・SPR-258）
	const { isPlaying, isLoading, audioPlayerRef, progressFillRef, handleToggle, playerHandlers } =
		useAudioPlayback({ onPlay });

	// 時間の計算
	const duration = (audioButton.endTime || audioButton.startTime) - audioButton.startTime;
	const youtubeUrl = `https://www.youtube.com/watch?v=${audioButton.videoId}&t=${Math.floor(audioButton.startTime)}s`;

	// タイトルの省略
	const displayTitle =
		audioButton.buttonText.length > maxTitleLength
			? `${audioButton.buttonText.slice(0, maxTitleLength)}...`
			: audioButton.buttonText;

	const handlePlayClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			handleToggle();
		},
		[handleToggle],
	);

	return (
		<>
			{/* プール化された音声プレイヤー（DOM要素なし） */}
			<AudioPlayer ref={audioPlayerRef} audioButton={audioButton} {...playerHandlers} />

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
					{/* 進捗フィル（DOMへ直接書き込むためReact state化しない）。
					    transition は進捗更新間隔と同値にして連続移動させる（短いとカクつく・SPR-259） */}
					<span
						ref={progressFillRef}
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-minase-200 transition-[width] ease-linear"
						style={{ width: "0%", transitionDuration: `${PROGRESS_TICK_MS}ms` }}
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
					<PopoverTrigger
						render={
							<button
								type="button"
								className="relative z-10 flex min-h-[44px] min-w-[44px] flex-none items-center justify-center border-l border-minase-200 text-minase-600 transition-colors hover:bg-minase-100 hover:text-minase-700"
								aria-label="詳細を表示"
							>
								<MoreHorizontal className="h-4 w-4" />
							</button>
						}
					/>
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
						showDetailLink={showDetailLink}
						onDetailClick={onDetailClick}
						onPopoverClose={() => setIsPopoverOpen(false)}
						searchQuery={searchQuery}
						highlightClassName={highlightClassName}
						xShareUrl={xShareUrl}
						isAuthenticated={isAuthenticated}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}
