import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { useCallback, useRef } from "react";
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
 * 時間の微調整と現在時間の設定を提供する。
 * かつての 100ms スロットルは撤廃（SPR-288）: 連打を黙って捨てる挙動が
 * ±0.1 の連続操作を壊していた。連続クリックはそのまま累積する。
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
	const startTimeRef = useRef<number>(startTime);
	const endTimeRef = useRef<number>(endTime);

	startTimeRef.current = startTime;
	endTimeRef.current = endTime;

	// 時間調整関数。ref は set 前に自前で進める＝再レンダー（React のバッチング）を挟まず
	// 連打されても全クリック分が累積する
	const adjustStartTime = useCallback(
		(deltaSeconds: number) => {
			const clampedTime = validation.clampTime(startTimeRef.current + deltaSeconds, videoDuration);
			startTimeRef.current = clampedTime;
			actions.setStartTime(clampedTime);
		},
		[actions, validation, videoDuration],
	);

	const adjustEndTime = useCallback(
		(deltaSeconds: number) => {
			const clampedTime = validation.clampTime(endTimeRef.current + deltaSeconds, videoDuration);
			endTimeRef.current = clampedTime;
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
