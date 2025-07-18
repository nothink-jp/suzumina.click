import { useCallback } from "react";
import type { TimeAdjustmentHook } from "./use-time-adjustment";

export interface TimeHandlers {
	onStartTimeInputChange: (value: string) => void;
	onEndTimeInputChange: (value: string) => void;
	onStartTimeBlur: () => void;
	onEndTimeBlur: () => void;
	onStartTimeKeyDown: (e: React.KeyboardEvent) => void;
	onEndTimeKeyDown: (e: React.KeyboardEvent) => void;
	onSetCurrentAsStart: () => void;
	onSetCurrentAsEnd: () => void;
	onAdjustStartTime: (delta: number) => void;
	onAdjustEndTime: (delta: number) => void;
	onPreviewRange: () => void;
}

export interface UseTimeHandlersProps {
	timeAdjustment: TimeAdjustmentHook;
	onPreviewRange: () => void;
}

/**
 * 時間調整用のハンドラーを提供する共通フック
 */
export function useTimeHandlers({
	timeAdjustment,
	onPreviewRange,
}: UseTimeHandlersProps): TimeHandlers {
	const onStartTimeInputChange = useCallback(
		(value: string) => {
			timeAdjustment.setStartTimeInput(value);
			timeAdjustment.setIsEditingStartTime(true);
		},
		[timeAdjustment.setStartTimeInput, timeAdjustment.setIsEditingStartTime],
	);

	const onEndTimeInputChange = useCallback(
		(value: string) => {
			timeAdjustment.setEndTimeInput(value);
			timeAdjustment.setIsEditingEndTime(true);
		},
		[timeAdjustment.setEndTimeInput, timeAdjustment.setIsEditingEndTime],
	);

	const onStartTimeBlur = useCallback(() => {
		const timeInSeconds = timeAdjustment.parseTimeString(timeAdjustment.startTimeInput);
		if (timeInSeconds !== null) {
			timeAdjustment.setStartTime(Math.round(timeInSeconds * 10) / 10);
		}
		timeAdjustment.setIsEditingStartTime(false);
	}, [
		timeAdjustment.parseTimeString,
		timeAdjustment.startTimeInput,
		timeAdjustment.setStartTime,
		timeAdjustment.setIsEditingStartTime,
	]);

	const onEndTimeBlur = useCallback(() => {
		const timeInSeconds = timeAdjustment.parseTimeString(timeAdjustment.endTimeInput);
		if (timeInSeconds !== null && timeInSeconds > timeAdjustment.startTime) {
			const newEndTime =
				Math.round(Math.min(timeInSeconds, timeAdjustment.startTime + 60) * 10) / 10;
			timeAdjustment.setEndTime(newEndTime);
		}
		timeAdjustment.setIsEditingEndTime(false);
	}, [
		timeAdjustment.parseTimeString,
		timeAdjustment.endTimeInput,
		timeAdjustment.startTime,
		timeAdjustment.setEndTime,
		timeAdjustment.setIsEditingEndTime,
	]);

	const onStartTimeKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			(e.target as HTMLInputElement).blur();
		}
	}, []);

	const onEndTimeKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			(e.target as HTMLInputElement).blur();
		}
	}, []);

	return {
		onStartTimeInputChange,
		onEndTimeInputChange,
		onStartTimeBlur,
		onEndTimeBlur,
		onStartTimeKeyDown,
		onEndTimeKeyDown,
		onSetCurrentAsStart: timeAdjustment.setCurrentAsStart,
		onSetCurrentAsEnd: timeAdjustment.setCurrentAsEnd,
		onAdjustStartTime: timeAdjustment.adjustStartTime,
		onAdjustEndTime: timeAdjustment.adjustEndTime,
		onPreviewRange,
	};
}
