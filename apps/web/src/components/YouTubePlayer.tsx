"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * YouTube Player API の型定義
 */
declare global {
	interface Window {
		YT: {
			Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
			PlayerState: {
				UNSTARTED: -1;
				ENDED: 0;
				PLAYING: 1;
				PAUSED: 2;
				BUFFERING: 3;
				CUED: 5;
			};
			ready: (callback: () => void) => void;
		};
		onYouTubeIframeAPIReady: () => void;
	}
}

interface YTPlayerConfig {
	height?: string | number;
	width?: string | number;
	videoId: string;
	playerVars?: {
		autoplay?: 0 | 1;
		controls?: 0 | 1;
		disablekb?: 0 | 1;
		enablejsapi?: 0 | 1;
		end?: number;
		fs?: 0 | 1;
		hl?: string;
		iv_load_policy?: 1 | 3;
		list?: string;
		listType?: "playlist" | "user_uploads";
		loop?: 0 | 1;
		modestbranding?: 0 | 1;
		origin?: string;
		playlist?: string;
		playsinline?: 0 | 1;
		rel?: 0 | 1;
		start?: number;
		widget_referrer?: string;
	};
	events?: {
		onReady?: (event: { target: YTPlayer }) => void;
		onStateChange?: (event: { target: YTPlayer; data: number }) => void;
		onPlaybackQualityChange?: (event: { target: YTPlayer; data: string }) => void;
		onPlaybackRateChange?: (event: { target: YTPlayer; data: number }) => void;
		onError?: (event: { target: YTPlayer; data: number }) => void;
		onApiChange?: (event: { target: YTPlayer }) => void;
	};
}

export interface YTPlayer {
	playVideo(): void;
	pauseVideo(): void;
	stopVideo(): void;
	seekTo(seconds: number, allowSeekAhead?: boolean): void;
	clearVideo(): void;
	nextVideo(): void;
	previousVideo(): void;
	playVideoAt(index: number): void;
	mute(): void;
	unMute(): void;
	isMuted(): boolean;
	setVolume(volume: number): void;
	getVolume(): number;
	setSize(width: number, height: number): void;
	getPlaybackRate(): number;
	setPlaybackRate(suggestedRate: number): void;
	getAvailablePlaybackRates(): number[];
	setLoop(loopPlaylists: boolean): void;
	setShuffle(shufflePlaylist: boolean): void;
	getVideoLoadedFraction(): number;
	getPlayerState(): number;
	getCurrentTime(): number;
	getVideoStartBytes(): number;
	getVideoBytesLoaded(): number;
	getVideoBytesTotal(): number;
	getDuration(): number;
	getVideoUrl(): string;
	getVideoEmbedCode(): string;
	getPlaylist(): string[];
	getPlaylistIndex(): number;
	destroy(): void;
	addEventListener(event: string, listener: (event: Event) => void): void;
	removeEventListener(event: string, listener: (event: Event) => void): void;
	getIframe(): HTMLIFrameElement;
	loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
	cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
}

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
	// biome-ignore lint/correctness/noUnusedFunctionParameters: loop will be implemented in future YouTube API integration
	loop = false,
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

	// 時間更新インターバルの開始
	const startTimeUpdateInterval = useCallback(() => {
		if (timeUpdateIntervalRef.current) {
			return;
		}

		timeUpdateIntervalRef.current = setInterval(() => {
			if (playerRef.current && onTimeUpdate) {
				try {
					const currentTime = playerRef.current.getCurrentTime();
					const duration = playerRef.current.getDuration();

					// 有効な数値のみコールバックを呼び出す
					if (
						typeof currentTime === "number" &&
						!Number.isNaN(currentTime) &&
						Number.isFinite(currentTime)
					) {
						onTimeUpdate(currentTime, duration || 0);
						// biome-ignore lint/suspicious/noConsole: Debug logging for time updates
						console.log("YouTube Player time update:", currentTime);
					} else {
						// biome-ignore lint/suspicious/noConsole: Debug logging for invalid values
						console.warn("YouTube Player invalid time:", currentTime, typeof currentTime);
					}
				} catch (error) {
					// YouTube APIエラー時は静かにスキップ（ログレベルを下げる）
					if (error instanceof Error && !error.message.includes("Maximum call stack")) {
						// biome-ignore lint/suspicious/noConsole: Debug logging for YouTube API errors
						console.warn("YouTube API time update failed:", error.message);
					}
				}
			}
		}, 1000); // 1秒間隔で更新
	}, [onTimeUpdate]);

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
				origin: window.location.origin,
				playsinline: 1,
				rel: rel ? 1 : 0,
				start: startTime,
				end: endTime,
			},
			events: {
				onReady: (event) => {
					playerRef.current = event.target;
					setPlayerReady(true);
					onReady?.(event.target);
				},
				onStateChange: (event) => {
					onStateChange?.(event.data, event.target);

					// 再生中の場合、時間更新のインターバルを開始
					if (event.data === window.YT.PlayerState.PLAYING) {
						startTimeUpdateInterval();
					} else {
						stopTimeUpdateInterval();
					}
				},
				onError: (event) => {
					onError?.(event.data);
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
		width,
		height,
		autoplay,
		controls,
		startTime,
		endTime,
		modestBranding,
		rel,
		startTimeUpdateInterval,
		stopTimeUpdateInterval,
		onReady,
		onStateChange,
		onError,
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
				className={`flex items-center justify-center bg-gray-100 ${className}`}
				style={{ width, height }}
			>
				<p className="text-gray-500">動画IDが指定されていません</p>
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
				<div className="flex items-center justify-center w-full h-full bg-gray-100">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						<p className="mt-2 text-gray-500">YouTube Player を読み込み中...</p>
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
