import { useCallback } from "react";

export interface TimeValidationUtilities {
	parseTimeString: (timeStr: string) => number | null;
	clampTime: (time: number, videoDuration: number) => number;
	validateTimeRange: (startTime: number, endTime: number) => boolean;
}

/**
 * 時間検証・変換ユーティリティフック
 * 時間文字列のパース、時間のクランプ、範囲検証を提供
 */
export function useTimeValidation(): TimeValidationUtilities {
	// 時間文字列をパースする関数
	const parseTimeString = useCallback((timeStr: string): number | null => {
		// 時:分:秒.小数 形式 (例: 1:23:45.6)
		const hourMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})\.(\d)$/);
		if (hourMatch?.[1] && hourMatch[2] && hourMatch[3] && hourMatch[4]) {
			const hours = Number.parseInt(hourMatch[1], 10);
			const minutes = Number.parseInt(hourMatch[2], 10);
			const seconds = Number.parseInt(hourMatch[3], 10);
			const decimal = Number.parseInt(hourMatch[4], 10);
			return hours * 3600 + minutes * 60 + seconds + decimal / 10;
		}

		// 分:秒.小数 形式 (例: 50:12.3)
		const minuteMatch = timeStr.match(/^(\d+):(\d{2})\.(\d)$/);
		if (minuteMatch?.[1] && minuteMatch[2] && minuteMatch[3]) {
			const minutes = Number.parseInt(minuteMatch[1], 10);
			const seconds = Number.parseInt(minuteMatch[2], 10);
			const decimal = Number.parseInt(minuteMatch[3], 10);
			return minutes * 60 + seconds + decimal / 10;
		}

		return null;
	}, []);

	// 時間をクランプする関数
	const clampTime = useCallback((time: number, videoDuration: number): number => {
		return Math.max(0, Math.min(Math.round(time * 10) / 10, videoDuration));
	}, []);

	// 時間範囲を検証する関数
	const validateTimeRange = useCallback((startTime: number, endTime: number): boolean => {
		return startTime >= 0 && endTime > startTime && endTime - startTime <= 60;
	}, []);

	return {
		parseTimeString,
		clampTime,
		validateTimeRange,
	};
}
