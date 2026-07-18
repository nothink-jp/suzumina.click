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
	// 時間文字列をパースする関数。
	// h:mm:ss / m:ss / 素の秒数 の3形式を受け付け、小数は任意（桁数自由）。
	// 旧実装は「小数1桁必須」の厳格形式のみで "1:23" や "83" が silent に破棄されていた（SPR-266 で寛容化）。
	// 分・秒の桁は1桁も許容（"1:2:3" = 1時間2分3秒）するが、値としての 60 以上は不正として弾く。
	const parseTimeString = useCallback((timeStr: string): number | null => {
		const trimmed = timeStr.trim();
		const fraction = (digits: string | undefined): number =>
			digits ? Number.parseFloat(`0.${digits}`) : 0;

		// 時:分:秒 形式 (例: 1:23:45.6 / 1:2:3)
		const hourMatch = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/);
		if (hourMatch?.[1] && hourMatch[2] && hourMatch[3]) {
			const hours = Number.parseInt(hourMatch[1], 10);
			const minutes = Number.parseInt(hourMatch[2], 10);
			const seconds = Number.parseInt(hourMatch[3], 10);
			if (minutes >= 60 || seconds >= 60) {
				return null;
			}
			return hours * 3600 + minutes * 60 + seconds + fraction(hourMatch[4]);
		}

		// 分:秒 形式 (例: 50:12.3 / 1:23)。長時間配信対応のため分は 60 以上も許容する
		const minuteMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
		if (minuteMatch?.[1] && minuteMatch[2]) {
			const minutes = Number.parseInt(minuteMatch[1], 10);
			const seconds = Number.parseInt(minuteMatch[2], 10);
			if (seconds >= 60) {
				return null;
			}
			return minutes * 60 + seconds + fraction(minuteMatch[3]);
		}

		// 素の秒数 (例: 83 / 83.4)
		const secondsMatch = trimmed.match(/^(\d+)(?:\.(\d+))?$/);
		if (secondsMatch?.[1]) {
			return Number.parseInt(secondsMatch[1], 10) + fraction(secondsMatch[2]);
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
