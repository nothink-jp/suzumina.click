"use client";

import { useCallback, useRef, useState } from "react";
import type { AudioControls, AudioPlayerProps } from "./audio-player";

/**
 * 再生状態機械の正本（SPR-258）。
 * AudioButton / PlayHero に逐語複製されていた isPlaying/isLoading・進捗フィル・
 * AudioPlayer ハンドラ群を一本化する。見た目は各コンポーネントの責務のまま。
 *
 * 使い方: 返り値の audioPlayerRef と playerHandlers を AudioPlayer に渡し、
 * progressFillRef を進捗フィル要素に張る。進捗は 250ms 毎の更新のため
 * React state にせず DOM へ直接書き込む（再レンダー回避）。
 */

interface UseAudioPlaybackOptions {
	/** 再生開始時に呼ばれる（再生計上など） */
	onPlay?: () => void;
	/** 再生状態の変化を親へ通知する（「再生中」表示の同期など） */
	onPlayStateChange?: (playing: boolean) => void;
}

export function useAudioPlayback({ onPlay, onPlayStateChange }: UseAudioPlaybackOptions = {}) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const audioPlayerRef = useRef<AudioControls>(null);
	const progressFillRef = useRef<HTMLSpanElement>(null);

	const handleToggle = useCallback(() => {
		if (isPlaying) {
			audioPlayerRef.current?.pause();
		} else {
			// 再生開始までの読み込み中はスピナーを出す（onPlay=handlePlayStart で解除）。
			// 以前は setIsLoading(true) の経路が無くスピナーが不達だった（SPR-200）。
			setIsLoading(true);
			audioPlayerRef.current?.play();
		}
	}, [isPlaying]);

	const resetProgressFill = useCallback(() => {
		if (progressFillRef.current) {
			progressFillRef.current.style.width = "0%";
		}
	}, []);

	const handlePlayStart = useCallback(() => {
		setIsPlaying(true);
		setIsLoading(false);
		onPlay?.();
		onPlayStateChange?.(true);
	}, [onPlay, onPlayStateChange]);

	const handleStop = useCallback(() => {
		setIsPlaying(false);
		setIsLoading(false);
		resetProgressFill();
		onPlayStateChange?.(false);
	}, [resetProgressFill, onPlayStateChange]);

	const handleProgress = useCallback((progressPercent: number) => {
		if (progressFillRef.current) {
			progressFillRef.current.style.width = `${progressPercent}%`;
		}
	}, []);

	const playerHandlers = {
		onPlay: handlePlayStart,
		onPause: handleStop,
		onEnd: handleStop,
		onProgress: handleProgress,
	} satisfies Pick<AudioPlayerProps, "onPlay" | "onPause" | "onEnd" | "onProgress">;

	return {
		isPlaying,
		isLoading,
		/** AudioPlayer の ref に渡す */
		audioPlayerRef,
		/** 進捗フィル要素（width % を DOM 直書き）に張る */
		progressFillRef,
		/** 再生/一時停止トグル */
		handleToggle,
		/** AudioPlayer にそのまま spread する */
		playerHandlers,
	};
}
