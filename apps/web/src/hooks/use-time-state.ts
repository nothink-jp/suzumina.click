import { formatTimestamp } from "@suzumina.click/shared-types";
import { useCallback, useState } from "react";

export interface TimeState {
	startTime: number;
	endTime: number;
	startTimeInput: string;
	endTimeInput: string;
	isEditingStartTime: boolean;
	isEditingEndTime: boolean;
	isAdjusting: boolean;
}

export interface TimeStateActions {
	setStartTime: (time: number) => void;
	setEndTime: (time: number) => void;
	setStartTimeInput: (input: string) => void;
	setEndTimeInput: (input: string) => void;
	setIsEditingStartTime: (editing: boolean) => void;
	setIsEditingEndTime: (editing: boolean) => void;
	setIsAdjusting: (adjusting: boolean) => void;
}

export interface UseTimeStateProps {
	initialStartTime: number;
	initialEndTime: number;
	videoDuration: number;
}

export interface UseTimeStateResult {
	state: TimeState;
	actions: TimeStateActions;
}

/**
 * 時間状態管理フック
 * 開始時間、終了時間、入力フィールドの状態を管理
 */
export function useTimeState({
	initialStartTime,
	initialEndTime,
	videoDuration,
}: UseTimeStateProps): UseTimeStateResult {
	// 状態管理
	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(initialEndTime);
	const [startTimeInput, setStartTimeInput] = useState(formatTimestamp(initialStartTime));
	const [endTimeInput, setEndTimeInput] = useState(formatTimestamp(initialEndTime));
	const [isEditingStartTime, setIsEditingStartTime] = useState(false);
	const [isEditingEndTime, setIsEditingEndTime] = useState(false);
	const [isAdjusting, setIsAdjusting] = useState(false);

	// 時間設定関数（入力フィールドも同期更新）
	const setStartTimeWithInput = useCallback(
		(time: number) => {
			const clampedTime = Math.max(0, Math.min(time, videoDuration));
			setStartTime(clampedTime);
			setStartTimeInput(formatTimestamp(clampedTime));
		},
		[videoDuration],
	);

	const setEndTimeWithInput = useCallback(
		(time: number) => {
			const clampedTime = Math.max(0, Math.min(time, videoDuration));
			setEndTime(clampedTime);
			setEndTimeInput(formatTimestamp(clampedTime));
		},
		[videoDuration],
	);

	return {
		state: {
			startTime,
			endTime,
			startTimeInput,
			endTimeInput,
			isEditingStartTime,
			isEditingEndTime,
			isAdjusting,
		},
		actions: {
			setStartTime: setStartTimeWithInput,
			setEndTime: setEndTimeWithInput,
			setStartTimeInput,
			setEndTimeInput,
			setIsEditingStartTime,
			setIsEditingEndTime,
			setIsAdjusting,
		},
	};
}
