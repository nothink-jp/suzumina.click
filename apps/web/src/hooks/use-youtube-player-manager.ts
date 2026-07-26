"use client";

import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseYouTubePlayerManagerProps {
	onTimeUpdate?: (currentTime: number) => void;
	initialVideoId?: string;
}

/** クリップ再生（区間試聴）の状態。isLoop はループ試聴中のみ true */
export interface ClipPlayback {
	isActive: boolean;
	isLoop: boolean;
}

interface ClipRange {
	from: number;
	to: number;
	loop: boolean;
}

/**
 * クリップ監視の1ティック。終端到達でループならシークバック、非ループなら onFinish。
 * シークバック直後は getCurrentTime が古い値を返すことがあるため wrapPending で一度だけ実行する
 */
function tickClipWatch(
	player: YTPlayer,
	clip: ClipRange,
	wrapPendingRef: React.MutableRefObject<boolean>,
	onFinish: () => void,
): void {
	try {
		const time = player.getCurrentTime();
		if (typeof time !== "number" || Number.isNaN(time) || !Number.isFinite(time)) {
			return;
		}
		if (time < clip.to) {
			wrapPendingRef.current = false;
			return;
		}
		if (!clip.loop) {
			onFinish();
			return;
		}
		if (!wrapPendingRef.current) {
			wrapPendingRef.current = true;
			player.seekTo(clip.from, true);
		}
	} catch (_error) {
		// Ignore player errors during clip watch
	}
}

interface YouTubePlayerManager {
	// Player state
	youtubePlayerRef: React.RefObject<YTPlayer | null>;
	videoId: string;
	videoDuration: number;
	currentTime: number;
	isPlayerReady: boolean;
	isLoading: boolean;
	clipPlayback: ClipPlayback;

	// Player actions
	setVideoId: (videoId: string) => void;
	onPlayerReady: () => void;
	onPlayerStateChange: (state: number) => void;
	startClip: (from: number, to: number, options?: { loop?: boolean }) => void;
	stopClip: () => void;
	updateClipBounds: (from: number, to: number) => void;
	seekTo: (time: number) => void;
	getCurrentPlayerTime: () => number;
}

export function useYouTubePlayerManager({
	onTimeUpdate,
	initialVideoId = "",
}: UseYouTubePlayerManagerProps = {}): YouTubePlayerManager {
	// Refs
	const youtubePlayerRef = useRef<YTPlayer | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const timeUpdateCallbackRef = useRef(onTimeUpdate);
	// クリップ再生の正本は ref（60ms ポーリングから読む）。state は UI 表示用の写し
	const clipRef = useRef<{ from: number; to: number; loop: boolean } | null>(null);
	const clipWatcherRef = useRef<NodeJS.Timeout | null>(null);
	const clipWrapPendingRef = useRef(false);

	// State
	const [videoId, setVideoId] = useState(initialVideoId);
	const [videoDuration, setVideoDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isPlayerReady, setIsPlayerReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [clipPlayback, setClipPlayback] = useState<ClipPlayback>({
		isActive: false,
		isLoop: false,
	});

	// Update callback ref when prop changes
	timeUpdateCallbackRef.current = onTimeUpdate;

	// Start time update interval
	const startTimeUpdate = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		intervalRef.current = setInterval(() => {
			if (youtubePlayerRef.current) {
				try {
					const playerTime = youtubePlayerRef.current.getCurrentTime();
					if (
						typeof playerTime === "number" &&
						!Number.isNaN(playerTime) &&
						Number.isFinite(playerTime)
					) {
						setCurrentTime(playerTime);
						timeUpdateCallbackRef.current?.(playerTime);
					}
				} catch (_error) {
					// Ignore player errors during time updates
				}
			}
		}, 100);
	}, []);

	// Stop time update interval
	const stopTimeUpdate = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	// Player ready handler
	const onPlayerReady = useCallback(() => {
		if (youtubePlayerRef.current) {
			try {
				const duration = youtubePlayerRef.current.getDuration();
				if (typeof duration === "number" && duration > 0) {
					setVideoDuration(duration);
					setIsPlayerReady(true);
					setIsLoading(false);
					startTimeUpdate();
				}
			} catch (_error) {
				setIsLoading(false);
			}
		}
	}, [startTimeUpdate]);

	// クリップ再生の監視停止（プレイヤーは触らない）。外部要因の一時停止時にも使う
	const deactivateClip = useCallback(() => {
		clipRef.current = null;
		clipWrapPendingRef.current = false;
		if (clipWatcherRef.current) {
			clearInterval(clipWatcherRef.current);
			clipWatcherRef.current = null;
		}
		setClipPlayback((prev) => (prev.isActive ? { isActive: false, isLoop: false } : prev));
	}, []);

	// Player state change handler
	const onPlayerStateChange = useCallback(
		(state: number) => {
			// YouTube player states:
			// -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
			switch (state) {
				case 1: // playing
					startTimeUpdate();
					break;
				case 2: // paused
				case 0: // ended
					stopTimeUpdate();
					// ユーザーが YouTube 側 UI で止めた場合もクリップ試聴を解除する
					deactivateClip();
					break;
				case 3: // buffering
					// Keep time updates during buffering
					break;
				case 5: // cued
					if (youtubePlayerRef.current) {
						try {
							const duration = youtubePlayerRef.current.getDuration();
							if (typeof duration === "number" && duration > 0) {
								setVideoDuration(duration);
								setIsPlayerReady(true);
								setIsLoading(false);
							}
						} catch (_error) {
							// Ignore errors
						}
					}
					break;
				default:
					break;
			}
		},
		[startTimeUpdate, stopTimeUpdate, deactivateClip],
	);

	// クリップ再生の停止（一時停止も行う）
	const stopClip = useCallback(() => {
		deactivateClip();
		if (youtubePlayerRef.current) {
			try {
				youtubePlayerRef.current.pauseVideo();
			} catch (_error) {
				// Ignore errors
			}
		}
	}, [deactivateClip]);

	/**
	 * 区間 [from, to] を再生する。loop 指定時は末尾で先頭へシークバックし続ける。
	 * 終端検知は setTimeout の一発予約ではなく 60ms ポーリング
	 * （バッファリングで実再生がずれても終端がずれない・ループ中の範囲変更に追従できる）
	 */
	const startClip = useCallback(
		(from: number, to: number, options?: { loop?: boolean }) => {
			const player = youtubePlayerRef.current;
			if (!player || !isPlayerReady) return;
			const clampedFrom = Math.max(0, from);
			if (to <= clampedFrom) return;

			const loop = options?.loop ?? false;
			clipRef.current = { from: clampedFrom, to, loop };
			clipWrapPendingRef.current = false;

			try {
				player.seekTo(clampedFrom, true);
				player.playVideo();
			} catch (_error) {
				clipRef.current = null;
				return;
			}
			setCurrentTime(clampedFrom);
			setClipPlayback({ isActive: true, isLoop: loop });

			if (clipWatcherRef.current) {
				clearInterval(clipWatcherRef.current);
			}
			clipWatcherRef.current = setInterval(() => {
				const clip = clipRef.current;
				const currentPlayer = youtubePlayerRef.current;
				if (!clip || !currentPlayer) return;
				tickClipWatch(currentPlayer, clip, clipWrapPendingRef, stopClip);
			}, 60);
		},
		[isPlayerReady, stopClip],
	);

	/** ループ試聴中の範囲変更に追従する（非アクティブ時は何もしない） */
	const updateClipBounds = useCallback((from: number, to: number) => {
		const clip = clipRef.current;
		if (!clip) return;
		const clampedFrom = Math.max(0, from);
		if (to <= clampedFrom) return;
		clip.from = clampedFrom;
		clip.to = to;
	}, []);

	// Seek to time function
	const seekTo = useCallback((time: number) => {
		if (!youtubePlayerRef.current) return;

		try {
			youtubePlayerRef.current.seekTo(time, true);
			setCurrentTime(time);
		} catch (_error) {}
	}, []);

	// Get current player time
	const getCurrentPlayerTime = useCallback((): number => {
		if (!youtubePlayerRef.current) return currentTime;

		try {
			const playerTime = youtubePlayerRef.current.getCurrentTime();
			if (
				typeof playerTime === "number" &&
				!Number.isNaN(playerTime) &&
				Number.isFinite(playerTime)
			) {
				return playerTime;
			}
		} catch (_error) {
			// Ignore errors
		}

		return currentTime;
	}, [currentTime]);

	// Set video ID with loading state
	const setVideoIdWithLoading = useCallback(
		(newVideoId: string) => {
			setIsLoading(true);
			setIsPlayerReady(false);
			setVideoDuration(0);
			setCurrentTime(0);
			stopTimeUpdate();
			deactivateClip();
			setVideoId(newVideoId);
		},
		[stopTimeUpdate, deactivateClip],
	);

	// Cleanup on unmount
	const cleanup = useCallback(() => {
		stopTimeUpdate();
		deactivateClip();
	}, [stopTimeUpdate, deactivateClip]);

	// Cleanup on unmount
	useEffect(() => {
		return cleanup;
	}, [cleanup]);

	return {
		// Player state
		youtubePlayerRef,
		videoId,
		videoDuration,
		currentTime,
		isPlayerReady,
		isLoading,
		clipPlayback,

		// Player actions
		setVideoId: setVideoIdWithLoading,
		onPlayerReady,
		onPlayerStateChange,
		startClip,
		stopClip,
		updateClipBounds,
		seekTo,
		getCurrentPlayerTime,
	};
}
