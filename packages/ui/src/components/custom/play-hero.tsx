"use client";

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Loader2, Pause, Play } from "lucide-react";
import { AudioPlayer } from "./audio-player";
import { useAudioPlayback } from "./use-audio-playback";

/**
 * 再生ヒーロー（ボタン画面刷新の中核部品・SPR-254）。
 * 「押すことが主役」の大型再生ボタンで、AudioPlayer（YouTube pool）接続まで内包する
 * （AudioButton と同じ構造 = audioButton を渡せば鳴る）。
 * デザイン正本: Claude Design「再生ヒーロー.dc.html」（L=詳細ページ / M=モーダル）
 */

interface PlayHeroProps {
	audioButton: AudioButtonType;
	/** L=詳細ページ用（再生中パルスリング付き）/ M=モーダル用 */
	size?: "L" | "M";
	onPlay?: () => void;
	/** 再生状態の変化を親へ通知する（メタ表示の「再生中」同期用） */
	onPlayStateChange?: (playing: boolean) => void;
	className?: string;
}

/** 再生サークル内のアイコン（読み込み中 → 一時停止 → 再生の優先順） */
function HeroCircleIcon({
	isLoading,
	isPlaying,
	isL,
}: {
	isLoading: boolean;
	isPlaying: boolean;
	isL: boolean;
}) {
	if (isLoading) {
		return <Loader2 className={cn("animate-spin", isL ? "h-6 w-6" : "h-5 w-5")} />;
	}
	if (isPlaying) {
		return <Pause className={cn("fill-current", isL ? "h-6 w-6" : "h-[22px] w-[22px]")} />;
	}
	return (
		<Play className={cn("translate-x-0.5 fill-current", isL ? "h-[26px] w-[26px]" : "h-6 w-6")} />
	);
}

export function PlayHero({
	audioButton,
	size = "L",
	onPlay,
	onPlayStateChange,
	className,
}: PlayHeroProps) {
	// 再生状態機械は useAudioPlayback に一本化（AudioButton と共有・SPR-258）
	const { isPlaying, isLoading, audioPlayerRef, progressFillRef, handleToggle, playerHandlers } =
		useAudioPlayback({ onPlay, onPlayStateChange });

	const isL = size === "L";

	return (
		<div className={cn("relative inline-block max-w-full", className)}>
			{/* プール化された音声プレイヤー（DOM要素なし） */}
			<AudioPlayer ref={audioPlayerRef} audioButton={audioButton} {...playerHandlers} />

			{/* 再生中パルスリング（Lのみ） */}
			{isL && isPlaying && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -inset-2 rounded-[26px] border-[3px] border-suzuka-400 animate-[play-hero-pulse_1.1s_ease-out_infinite]"
				/>
			)}

			<button
				type="button"
				onClick={handleToggle}
				disabled={isLoading}
				aria-label={isPlaying ? "一時停止" : "再生"}
				className={cn(
					"relative inline-flex max-w-full cursor-pointer items-center overflow-hidden border-minase-300 bg-minase-50 text-left",
					"transition-[transform,border-color,box-shadow] duration-150 hover:border-minase-500 active:scale-[0.98]",
					"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
					isL
						? "gap-4 rounded-[20px] border-2 py-4 pr-[30px] pl-4 max-w-[min(88vw,640px)] shadow-[0_10px_28px_hsl(var(--suzuka-500)/0.14)] hover:shadow-[0_12px_32px_hsl(var(--minase-500)/0.22)]"
						: "gap-3.5 rounded-2xl border-[1.5px] py-3 pr-[26px] pl-3 shadow-[0_6px_18px_hsl(var(--suzuka-500)/0.12)] hover:shadow-[0_8px_22px_hsl(var(--minase-500)/0.2)]",
				)}
			>
				{/* 進捗フィル（DOMへ直接書き込むためReact state化しない） */}
				<span
					ref={progressFillRef}
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 bg-minase-200 transition-[width] duration-100 ease-linear"
					style={{ width: "0%" }}
				/>

				{/* 再生サークル */}
				<span
					className={cn(
						"relative flex flex-none items-center justify-center rounded-full bg-minase-500 text-white",
						isL ? "h-[60px] w-[60px] shadow-[0_4px_12px_hsl(var(--minase-700)/0.3)]" : "h-14 w-14",
					)}
				>
					<HeroCircleIcon isLoading={isLoading} isPlaying={isPlaying} isL={isL} />
				</span>

				{/* ボタン名 */}
				<span
					className={cn(
						"relative font-extrabold text-minase-950 break-words",
						isL ? "text-[clamp(20px,2.6vw,30px)] leading-[1.25]" : "text-2xl leading-[1.3]",
					)}
				>
					{audioButton.buttonText}
				</span>
			</button>
		</div>
	);
}
