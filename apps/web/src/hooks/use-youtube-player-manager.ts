"use client";

import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseYouTubePlayerManagerProps {
	onTimeUpdate?: (currentTime: number) => void;
	initialVideoId?: string;
}

interface YouTubePlayerManager {
	// Player state
	youtubePlayerRef: React.RefObject<YTPlayer | null>;
	videoId: string;
	videoDuration: number;
	currentTime: number;
	isPlayerReady: boolean;
	isLoading: boolean;

	// Player actions
	setVideoId: (videoId: string) => void;
	onPlayerReady: () => void;
	onPlayerStateChange: (state: number) => void;
	playRange: (startTime: number, endTime: number) => void;
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

	// State
	const [videoId, setVideoId] = useState(initialVideoId);
	const [videoDuration, setVideoDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isPlayerReady, setIsPlayerReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

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
		[startTimeUpdate, stopTimeUpdate],
	);

	// Play range function
	const playRange = useCallback(
		(startTime: number, endTime: number) => {
			if (!youtubePlayerRef.current) return;

			// Ensure player is ready
			if (!isPlayerReady) return;

			try {
				// Ensure we have valid times
				if (startTime < 0 || endTime <= startTime) return;

				// Get current player state
				const playerState = youtubePlayerRef.current.getPlayerState();

				// YouTube states: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
				const isReadyToPlay = playerState === 1 || playerState === 2 || playerState === 5;

				if (!isReadyToPlay) return;

				// Stop current playback if playing
				if (playerState === 1) {
					youtubePlayerRef.current.pauseVideo();
				}

				// Seek to start time
				youtubePlayerRef.current.seekTo(startTime, true);

				// Wait for seek to complete, then play
				setTimeout(() => {
					if (youtubePlayerRef.current) {
						try {
							youtubePlayerRef.current.playVideo();

							// Schedule pause at end time
							const duration = (endTime - startTime) * 1000;
							setTimeout(() => {
								if (youtubePlayerRef.current) {
									try {
										youtubePlayerRef.current.pauseVideo();
									} catch (_error) {
										// Ignore errors
									}
								}
							}, duration);
						} catch (_error) {}
					}
				}, 300);
			} catch (_error) {}
		},
		[isPlayerReady],
	);

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
			setVideoId(newVideoId);
		},
		[stopTimeUpdate],
	);

	// Cleanup on unmount
	const cleanup = useCallback(() => {
		stopTimeUpdate();
	}, [stopTimeUpdate]);

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

		// Player actions
		setVideoId: setVideoIdWithLoading,
		onPlayerReady,
		onPlayerStateChange,
		playRange,
		seekTo,
		getCurrentPlayerTime,
	};
}
