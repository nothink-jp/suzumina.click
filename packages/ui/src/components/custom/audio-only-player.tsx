"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { YTPlayer } from "./youtube-types";

export interface AudioOnlyPlayerProps {
	/** YouTube video ID */
	videoId: string;
	/** Start time in seconds */
	startTime: number;
	/** End time in seconds (optional) */
	endTime?: number;
	/** Auto play */
	autoPlay?: boolean;
	/** Volume (0-100) */
	volume?: number;
	/** Callback when ready */
	onReady?: () => void;
	/** Callback when playback starts */
	onPlay?: () => void;
	/** Callback when playback pauses */
	onPause?: () => void;
	/** Callback when playback ends */
	onEnd?: () => void;
	/** Callback on error */
	onError?: (error: number) => void;
	/** CSS class name */
	className?: string;
}

/**
 * YouTube動画の音声のみを再生するコンポーネント
 *
 * 動画要素は非表示にして音声のみを再生する
 */
export const AudioOnlyPlayer = forwardRef<HTMLDivElement, AudioOnlyPlayerProps>(
	function AudioOnlyPlayer(
		{
			videoId,
			startTime,
			endTime,
			autoPlay = false,
			volume = 50,
			onReady,
			onPlay,
			onPause,
			onEnd,
			onError,
			className = "",
		},
		ref,
	) {
		const playerRef = useRef<YTPlayer | null>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const [isAPIReady, setIsAPIReady] = useState(false);
		const [isPlayerReady, setIsPlayerReady] = useState(false);
		const [isPlaying, setIsPlaying] = useState(false);
		const endTimeRef = useRef<number | undefined>(endTime);
		const checkEndTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

		// endTimeの更新
		useEffect(() => {
			endTimeRef.current = endTime;
		}, [endTime]);

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

		// endTime監視用のインターバル
		const startEndTimeCheck = useCallback(() => {
			if (!endTimeRef.current || checkEndTimeIntervalRef.current) {
				return;
			}

			checkEndTimeIntervalRef.current = setInterval(() => {
				if (!playerRef.current || !endTimeRef.current) {
					return;
				}

				try {
					const currentTime = playerRef.current.getCurrentTime();
					if (currentTime >= endTimeRef.current) {
						playerRef.current.pauseVideo();
						onEnd?.();
					}
				} catch (_error) {
					if (process.env.NODE_ENV === "development") {
						// console.warn("End time check failed:", error);
					}
				}
			}, 100); // 100ms間隔でチェック
		}, [onEnd]);

		const stopEndTimeCheck = useCallback(() => {
			if (checkEndTimeIntervalRef.current) {
				clearInterval(checkEndTimeIntervalRef.current);
				checkEndTimeIntervalRef.current = null;
			}
		}, []);

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

			// プレイヤー要素の作成（非表示）
			const playerId = `audio-only-player-${Math.random().toString(36).substr(2, 9)}`;
			const playerElement = document.createElement("div");
			playerElement.id = playerId;
			// 完全に非表示にする
			playerElement.style.position = "absolute";
			playerElement.style.left = "-9999px";
			playerElement.style.width = "1px";
			playerElement.style.height = "1px";
			playerElement.style.opacity = "0";
			playerElement.style.pointerEvents = "none";

			containerRef.current.appendChild(playerElement);

			// プレイヤーの初期化
			const player = new window.YT.Player(playerId, {
				height: 1,
				width: 1,
				videoId,
				playerVars: {
					autoplay: autoPlay ? 1 : 0,
					controls: 0, // コントロールを非表示
					disablekb: 1, // キーボード操作を無効
					enablejsapi: 1,
					fs: 0, // フルスクリーンを無効
					iv_load_policy: 3, // アノテーションを非表示
					modestbranding: 1,
					rel: 0, // 関連動画を非表示
					start: startTime,
					end: endTime,
					playsinline: 1,
				},
				events: {
					onReady: (event) => {
						playerRef.current = event.target;
						setIsPlayerReady(true);

						// 音量設定
						event.target.setVolume(volume);

						onReady?.();
					},
					onStateChange: (event) => {
						const state = event.data;
						const isNowPlaying = state === window.YT.PlayerState.PLAYING;

						setIsPlaying(isNowPlaying);

						if (isNowPlaying) {
							onPlay?.();
							startEndTimeCheck();
						} else {
							stopEndTimeCheck();

							if (state === window.YT.PlayerState.PAUSED) {
								onPause?.();
							} else if (state === window.YT.PlayerState.ENDED) {
								onEnd?.();
							}
						}
					},
					onError: (event) => {
						if (process.env.NODE_ENV === "development") {
							// console.error("Audio Only Player Error:", {
							// 	errorCode: event.data,
							// 	videoId,
							// 	startTime,
							// 	endTime,
							// });
						}
						onError?.(event.data);
					},
				},
			});

			return () => {
				stopEndTimeCheck();
				if (player && typeof player.destroy === "function") {
					player.destroy();
				}
				setIsPlayerReady(false);
			};
		}, [
			isAPIReady,
			videoId,
			startTime,
			endTime,
			autoPlay,
			volume,
			onReady,
			onPlay,
			onPause,
			onEnd,
			onError,
			startEndTimeCheck,
			stopEndTimeCheck,
		]);

		// 公開メソッド
		const play = useCallback(() => {
			if (playerRef.current && isPlayerReady) {
				// 開始時間にシーク
				playerRef.current.seekTo(startTime, true);
				playerRef.current.playVideo();
			}
		}, [isPlayerReady, startTime]);

		const pause = useCallback(() => {
			if (playerRef.current && isPlayerReady) {
				playerRef.current.pauseVideo();
			}
		}, [isPlayerReady]);

		const stop = useCallback(() => {
			if (playerRef.current && isPlayerReady) {
				playerRef.current.pauseVideo();
				playerRef.current.seekTo(startTime, true);
			}
		}, [isPlayerReady, startTime]);

		const setPlayerVolume = useCallback(
			(vol: number) => {
				if (playerRef.current && isPlayerReady) {
					playerRef.current.setVolume(Math.max(0, Math.min(100, vol)));
				}
			},
			[isPlayerReady],
		);

		// 外部から制御できるようにrefを通じてメソッドを公開
		useEffect(() => {
			if (containerRef.current && isPlayerReady) {
				// audioControlsプロパティを動的に追加する型安全な方法
				Object.assign(containerRef.current, {
					audioControls: {
						play,
						pause,
						stop,
						setVolume: setPlayerVolume,
						isPlaying,
						isReady: isPlayerReady,
					},
				});
			}
		}, [play, pause, stop, setPlayerVolume, isPlaying, isPlayerReady]);

		return (
			<div
				ref={(node) => {
					containerRef.current = node;
					if (typeof ref === "function") {
						ref(node);
					} else if (ref) {
						ref.current = node;
					}
				}}
				className={`audio-only-player ${className}`}
				style={{ display: "none" }} // コンテナも非表示
			>
				{/* 音声プレイヤーは完全に非表示 */}
			</div>
		);
	},
);

export default AudioOnlyPlayer;
