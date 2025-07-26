/**
 * プール化された音声プレイヤー（DOM要素なし）
 *
 * 設計特徴:
 * - DOM要素なし: 既存のYouTube Player プールを使用
 * - メモリ効率: プール共有により大幅削減
 * - 既存互換: AudioOnlyPlayerの置き換え可能
 */

"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { type PlaySegmentCallbacks, youTubePlayerPool } from "../../lib/youtube-player-pool";

export interface AudioPlayerProps {
	/** 音声ボタンデータ */
	audioButton: FrontendAudioButtonData;
	/** 再生開始時のコールバック */
	onPlay?: () => void;
	/** 一時停止時のコールバック */
	onPause?: () => void;
	/** 再生終了時のコールバック */
	onEnd?: () => void;
	/** 音量（0-100） */
	volume?: number;
	/** 自動再生するかどうか */
	autoPlay?: boolean;
}

export interface AudioControls {
	/** 再生開始 */
	play: () => void;
	/** 一時停止 */
	pause: () => void;
	/** 停止 */
	stop: () => void;
	/** 音量設定（0-100） */
	setVolume: (volume: number) => void;
	/** 現在の再生状態 */
	isPlaying: boolean;
	/** プレイヤーの準備状態 */
	isReady: boolean;
}

/**
 * プール化された音声プレイヤーコンポーネント
 */
export const AudioPlayer = forwardRef<AudioControls, AudioPlayerProps>(
	({ audioButton, onPlay, onPause, onEnd, volume = 50, autoPlay = false }, ref) => {
		const [isPlaying, setIsPlaying] = useState(false);
		const [isReady, setIsReady] = useState(false);
		const mountedRef = useRef(true);

		// プール参照
		const pool = youTubePlayerPool;

		/**
		 * 再生処理
		 */
		const handlePlay = useCallback(async () => {
			if (!mountedRef.current) return;

			try {
				const callbacks: PlaySegmentCallbacks = {
					onPlay: () => {
						if (mountedRef.current) {
							setIsPlaying(true);
							onPlay?.();
						}
					},
					onPause: () => {
						if (mountedRef.current) {
							setIsPlaying(false);
							onPause?.();
						}
					},
					onEnd: () => {
						if (mountedRef.current) {
							setIsPlaying(false);
							onEnd?.();
						}
					},
				};

				await pool.playSegment(
					audioButton.sourceVideoId,
					audioButton.startTime,
					audioButton.endTime || audioButton.startTime,
					callbacks,
				);
			} catch (error) {
				console.error("Failed to play audio:", error);
				if (mountedRef.current) {
					setIsPlaying(false);
					onEnd?.();
				}
			}
		}, [audioButton, onPlay, onPause, onEnd, pool.playSegment]);

		/**
		 * 一時停止処理
		 */
		const handlePause = useCallback(() => {
			pool.stopCurrentSegment();
			if (mountedRef.current) {
				setIsPlaying(false);
				onPause?.();
			}
		}, [onPause, pool.stopCurrentSegment]);

		/**
		 * 停止処理
		 */
		const handleStop = useCallback(() => {
			pool.stopCurrentSegment();
			if (mountedRef.current) {
				setIsPlaying(false);
				onEnd?.();
			}
		}, [onEnd, pool.stopCurrentSegment]);

		/**
		 * 音量設定
		 */
		const handleSetVolume = useCallback(
			async (newVolume: number) => {
				try {
					// プールから現在のプレイヤーを取得して音量設定
					const player = await pool.getOrCreatePlayer(audioButton.sourceVideoId);
					player.setVolume(Math.max(0, Math.min(100, newVolume)));
				} catch (error) {
					console.error("Failed to set volume:", error);
				}
			},
			[audioButton.sourceVideoId, pool.getOrCreatePlayer],
		);

		// YouTube API準備完了の監視
		useEffect(() => {
			pool.onReady(() => {
				if (mountedRef.current) {
					setIsReady(true);
				}
			});
		}, [pool.onReady]);

		// 音量の初期設定
		useEffect(() => {
			if (isReady && volume !== 50) {
				handleSetVolume(volume);
			}
		}, [isReady, volume, handleSetVolume]);

		// 自動再生
		useEffect(() => {
			if (isReady && autoPlay && !isPlaying && mountedRef.current) {
				handlePlay();
			}
		}, [isReady, autoPlay, isPlaying, handlePlay]);

		// マウント状態の管理
		useEffect(() => {
			mountedRef.current = true;
			return () => {
				mountedRef.current = false;
				// コンポーネントアンマウント時に再生停止
				if (isPlaying) {
					pool.stopCurrentSegment();
				}
			};
		}, [isPlaying, pool.stopCurrentSegment]);

		// 外部制御用のAPI公開
		useImperativeHandle(
			ref,
			() => ({
				play: handlePlay,
				pause: handlePause,
				stop: handleStop,
				setVolume: handleSetVolume,
				isPlaying,
				isReady,
			}),
			[handlePlay, handlePause, handleStop, handleSetVolume, isPlaying, isReady],
		);

		// このコンポーネントはDOM要素を持たない
		return null;
	},
);

AudioPlayer.displayName = "AudioPlayer";

/**
 * AudioPlayerの状態を監視するフック
 */
export const useAudioPlayerState = (audioButton: FrontendAudioButtonData) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const pool = youTubePlayerPool;

		pool.onReady(() => {
			setIsReady(true);
		});

		// プールの統計情報から現在の再生状態を取得
		const checkPlayingState = () => {
			const stats = pool.getStats();
			setIsPlaying(stats.activeSegmentVideoId === audioButton.sourceVideoId);
		};

		// 定期的に状態をチェック
		const interval = setInterval(checkPlayingState, 500);

		return () => {
			clearInterval(interval);
		};
	}, [audioButton.sourceVideoId]);

	return {
		isPlaying,
		isReady,
	};
};

/**
 * プール統計情報を取得するフック
 */
export const useYouTubePlayerPoolStats = () => {
	const [stats, setStats] = useState(youTubePlayerPool.getStats());

	useEffect(() => {
		const interval = setInterval(() => {
			setStats(youTubePlayerPool.getStats());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return stats;
};
