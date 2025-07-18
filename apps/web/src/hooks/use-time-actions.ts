import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { useCallback, useEffect, useRef } from "react";
import type { TimeStateActions } from "./use-time-state";
import type { TimeValidationUtilities } from "./use-time-validation";

export interface TimeActions {
	adjustStartTime: (deltaSeconds: number) => void;
	adjustEndTime: (deltaSeconds: number) => void;
	setCurrentAsStart: () => void;
	setCurrentAsEnd: () => void;
}

export interface UseTimeActionsProps {
	// State and actions
	startTime: number;
	endTime: number;
	actions: TimeStateActions;

	// Validation utilities
	validation: TimeValidationUtilities;

	// External dependencies
	videoDuration: number;
	currentTime: number;
	youtubePlayerRef: React.RefObject<YTPlayer | null>;
}

/**
 * 時間操作・調整フック
 * 時間の微調整、現在時間の設定、デバッグ機能を提供
 */
export function useTimeActions({
	startTime,
	endTime,
	actions,
	validation,
	videoDuration,
	currentTime,
	youtubePlayerRef,
}: UseTimeActionsProps): TimeActions {
	const lastAdjustmentRef = useRef<number>(0);
	const startTimeRef = useRef<number>(startTime);
	const endTimeRef = useRef<number>(endTime);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	startTimeRef.current = startTime;
	endTimeRef.current = endTime;

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// 時間調整関数
	const adjustStartTime = useCallback(
		(deltaSeconds: number) => {
			const now = Date.now();
			if (now - lastAdjustmentRef.current < 100) {
				return;
			}
			lastAdjustmentRef.current = now;

			actions.setIsAdjusting(true);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => actions.setIsAdjusting(false), 100);

			const currentStartTime = startTimeRef.current;
			const _currentEndTime = endTimeRef.current;
			const expectedTime = currentStartTime + deltaSeconds;
			const clampedTime = validation.clampTime(expectedTime, videoDuration);

			actions.setStartTime(clampedTime);
		},
		[actions, validation, videoDuration],
	);

	const adjustEndTime = useCallback(
		(deltaSeconds: number) => {
			const now = Date.now();
			if (now - lastAdjustmentRef.current < 100) {
				return;
			}
			lastAdjustmentRef.current = now;

			actions.setIsAdjusting(true);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => actions.setIsAdjusting(false), 100);

			const _currentStartTime = startTimeRef.current;
			const currentEndTime = endTimeRef.current;
			const expectedTime = currentEndTime + deltaSeconds;
			const clampedTime = validation.clampTime(expectedTime, videoDuration);

			actions.setEndTime(clampedTime);
		},
		[actions, validation, videoDuration],
	);

	// 現在時間設定関数
	const setCurrentAsStart = useCallback(() => {
		let time = Math.round(currentTime * 10) / 10;

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.round(playerTime * 10) / 10;
				}
			} catch (_error) {
				// Ignore errors from YouTube API
			}
		}
		actions.setStartTime(time);
	}, [currentTime, youtubePlayerRef, actions]);

	const setCurrentAsEnd = useCallback(() => {
		let time = Math.round(currentTime * 10) / 10;

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.round(playerTime * 10) / 10;
				}
			} catch (_error) {
				// Ignore errors from YouTube API
			}
		}

		actions.setEndTime(time);
	}, [currentTime, youtubePlayerRef, actions]);

	return {
		adjustStartTime,
		adjustEndTime,
		setCurrentAsStart,
		setCurrentAsEnd,
	};
}
