"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { YTPlayer } from "./youtube-types";

// 外部で使用するための型をエクスポート
export type { YTPlayer };

/**
 * YouTube Player component props
 */
export interface YouTubePlayerProps {
	/** YouTube video ID */
	videoId: string;
	/** Player width */
	width?: string | number;
	/** Player height */
	height?: string | number;
	/** Auto play video */
	autoplay?: boolean;
	/** Show player controls */
	controls?: boolean;
	/** Start time in seconds */
	startTime?: number;
	/** End time in seconds */
	endTime?: number;
	/** Loop the video */
	loop?: boolean;
	/** Modest branding */
	modestBranding?: boolean;
	/** Related videos */
	rel?: boolean;
	/** Class name for styling */
	className?: string;
	/** Callback when player is ready */
	onReady?: (player: YTPlayer) => void;
	/** Callback when player state changes */
	onStateChange?: (state: number, player: YTPlayer) => void;
	/** Callback when time updates */
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	/** Callback on error */
	onError?: (error: number) => void;
}

/**
 * YouTube Player Component
 *
 * YouTube IFrame Player API を使用してYouTube動画を埋め込み・制御する
 */
export function YouTubePlayer({
	videoId,
	width = "100%",
	height = "100%",
	autoplay = false,
	controls = true,
	startTime,
	endTime,
	loop: _loop = false,
	modestBranding = true,
	rel = false,
	className = "",
	onReady,
	onStateChange,
	onTimeUpdate,
	onError,
}: YouTubePlayerProps) {
	const playerRef = useRef<YTPlayer | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isAPIReady, setIsAPIReady] = useState(false);
	const [playerReady, setPlayerReady] = useState(false);
	const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Store callback refs to avoid re-initialization
	const onReadyRef = useRef(onReady);
	const onStateChangeRef = useRef(onStateChange);
	const onErrorRef = useRef(onError);

	// Update refs when props change
	onReadyRef.current = onReady;
	onStateChangeRef.current = onStateChange;
	onErrorRef.current = onError;

	// YouTube API の読み込み
	useEffect(() => {
		// すでにAPIが読み込まれている場合
		if (window.YT?.Player) {
			setIsAPIReady(true);
			return;
		}

		// API読み込み中の場合は待機
		if (window.onYouTubeIframeAPIReady) {
			const originalCallback = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				originalCallback();
				setIsAPIReady(true);
			};
			return;
		}

		// APIスクリプトの読み込み
		const script = document.createElement("script");
		script.src = "https://www.youtube.com/iframe_api";
		script.async = true;

		window.onYouTubeIframeAPIReady = () => {
			setIsAPIReady(true);
		};

		document.body.appendChild(script);

		return () => {
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	}, []);

	// 時間が有効な数値かチェック
	const isValidTime = useCallback((time: number): boolean => {
		return typeof time === "number" && !Number.isNaN(time) && Number.isFinite(time);
	}, []);

	// 時間更新処理
	const handleTimeUpdate = useCallback(() => {
		if (!playerRef.current || !onTimeUpdate) {
			return;
		}

		try {
			const currentTime = playerRef.current.getCurrentTime();
			const duration = playerRef.current.getDuration();

			if (isValidTime(currentTime)) {
				onTimeUpdate(currentTime, duration || 0);
			}
		} catch (_error) {
			// Ignore errors during time updates
		}
	}, [onTimeUpdate, isValidTime]);

	// 時間更新インターバルの開始
	const startTimeUpdateInterval = useCallback(() => {
		if (timeUpdateIntervalRef.current) {
			return;
		}

		timeUpdateIntervalRef.current = setInterval(handleTimeUpdate, 100); // 100ms間隔で更新
	}, [handleTimeUpdate]);

	// 時間更新インターバルの停止
	const stopTimeUpdateInterval = useCallback(() => {
		if (timeUpdateIntervalRef.current) {
			clearInterval(timeUpdateIntervalRef.current);
			timeUpdateIntervalRef.current = null;
		}
	}, []);

	// プレイヤー制御メソッドの公開
	const playerControls = useMemo(
		() => ({
			play: () => playerRef.current?.playVideo(),
			pause: () => playerRef.current?.pauseVideo(),
			stop: () => playerRef.current?.stopVideo(),
			seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
			getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
			getDuration: () => playerRef.current?.getDuration() || 0,
			getPlayerState: () => playerRef.current?.getPlayerState() || -1,
			setVolume: (volume: number) => playerRef.current?.setVolume(volume),
			getVolume: () => playerRef.current?.getVolume() || 50,
			mute: () => playerRef.current?.mute(),
			unmute: () => playerRef.current?.unMute(),
			isMuted: () => playerRef.current?.isMuted() || false,
		}),
		[],
	);

	// プレイヤーの初期化
	useEffect(() => {
		if (!isAPIReady || !containerRef.current || !videoId) {
			return;
		}

		// 既存のプレイヤーを破棄
		if (playerRef.current) {
			playerRef.current.destroy();
			playerRef.current = null;
		}

		// プレイヤー要素の作成
		const playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
		const playerElement = document.createElement("div");
		playerElement.id = playerId;
		containerRef.current.appendChild(playerElement);

		// プレイヤーの初期化
		const player = new window.YT.Player(playerId, {
			height: "100%",
			width: "100%",
			videoId,
			playerVars: {
				autoplay: autoplay ? 1 : 0,
				controls: controls ? 1 : 0,
				disablekb: 0,
				enablejsapi: 1,
				fs: 1,
				hl: "ja",
				iv_load_policy: 3,
				modestbranding: modestBranding ? 1 : 0,
				playsinline: 1,
				rel: rel ? 1 : 0,
				start: startTime,
				end: endTime,
			},
			events: {
				onReady: (event) => {
					playerRef.current = event.target;
					setPlayerReady(true);
					onReadyRef.current?.(event.target);
				},
				onStateChange: (event) => {
					onStateChangeRef.current?.(event.data, event.target);

					// 再生中の場合、時間更新のインターバルを開始
					if (event.data === window.YT.PlayerState.PLAYING) {
						startTimeUpdateInterval();
					} else {
						stopTimeUpdateInterval();
					}
				},
				onError: (event) => {
					onErrorRef.current?.(event.data);
				},
			},
		});

		return () => {
			stopTimeUpdateInterval();
			if (player && typeof player.destroy === "function") {
				player.destroy();
			}
			setPlayerReady(false);
		};
	}, [
		isAPIReady,
		videoId,
		autoplay,
		controls,
		startTime,
		endTime,
		modestBranding,
		rel,
		startTimeUpdateInterval,
		stopTimeUpdateInterval,
		// Note: onReady, onStateChange, onError are not included in deps to prevent re-initialization
	]);

	// 親コンポーネントに制御メソッドを公開
	useEffect(() => {
		if (playerReady && onReady && playerRef.current) {
			// プレイヤーインスタンスに追加のメソッドのみ追加（既存メソッドは上書きしない）
			const additionalMethods = {
				play: playerControls.play,
				pause: playerControls.pause,
				stop: playerControls.stop,
				// getCurrentTime は既存のメソッドを保持
				// getDuration は既存のメソッドを保持
				// seekTo は既存のメソッドを保持
			};
			Object.assign(playerRef.current, additionalMethods);
		}
	}, [playerReady, onReady, playerControls]);

	if (!videoId) {
		return (
			<div
				className={`flex items-center justify-center bg-muted ${className}`}
				style={{ width, height }}
			>
				<p className="text-muted-foreground">動画IDが指定されていません</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`youtube-player-container w-full h-full ${className}`}
			style={{ width, height }}
		>
			{!isAPIReady && (
				<div className="flex items-center justify-center w-full h-full bg-muted">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						<p className="mt-2 text-muted-foreground">YouTube Player を読み込み中...</p>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * YouTube Player Hook
 *
 * YouTubePlayerコンポーネントの制御を簡単にするためのhook
 */
export function useYouTubePlayer() {
	const [player, setPlayer] = useState<YTPlayer | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(50);
	const [isMuted, setIsMuted] = useState(false);

	const handleReady = useCallback((playerInstance: YTPlayer) => {
		setPlayer(playerInstance);
	}, []);

	const handleStateChange = useCallback((state: number) => {
		setIsPlaying(state === window.YT?.PlayerState?.PLAYING);
	}, []);

	const handleTimeUpdate = useCallback((time: number, dur: number) => {
		setCurrentTime(time);
		setDuration(dur);
	}, []);

	const controls = {
		play: () => {
			player?.playVideo();
			setIsPlaying(true);
		},
		pause: () => {
			player?.pauseVideo();
			setIsPlaying(false);
		},
		stop: () => {
			player?.stopVideo();
			setIsPlaying(false);
		},
		seekTo: (seconds: number) => {
			player?.seekTo(seconds, true);
			setCurrentTime(seconds);
		},
		setVolume: (vol: number) => {
			player?.setVolume(vol);
			setVolumeState(vol);
		},
		mute: () => {
			player?.mute();
			setIsMuted(true);
		},
		unmute: () => {
			player?.unMute();
			setIsMuted(false);
		},
	};

	return {
		player,
		isPlaying,
		currentTime,
		duration,
		volume,
		isMuted,
		controls,
		handlers: {
			onReady: handleReady,
			onStateChange: handleStateChange,
			onTimeUpdate: handleTimeUpdate,
		},
	};
}

export default YouTubePlayer;
