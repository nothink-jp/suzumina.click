import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import type { TimeActions } from "./use-time-actions";
import { useTimeActions } from "./use-time-actions";
import type { TimeState, TimeStateActions } from "./use-time-state";
import { useTimeState } from "./use-time-state";
import { useTimeValidation } from "./use-time-validation";

export interface TimeAdjustmentHook extends TimeState, TimeStateActions, TimeActions {
	parseTimeString: (timeStr: string) => number | null;
}

interface UseTimeAdjustmentProps {
	videoDuration: number;
	currentTime: number;
	youtubePlayerRef: React.RefObject<YTPlayer | null>;
	initialStartTime?: number;
	initialEndTime?: number;
}

/**
 * 時間調整の統合フック
 * 3つのサブフックを組み合わせて既存のAPIを維持
 */
export function useTimeAdjustment({
	videoDuration,
	currentTime,
	youtubePlayerRef,
	initialStartTime = 0,
	initialEndTime = 0,
}: UseTimeAdjustmentProps): TimeAdjustmentHook {
	// 時間状態管理
	const { state, actions } = useTimeState({
		initialStartTime,
		initialEndTime,
		videoDuration,
	});

	// 時間検証ユーティリティ
	const validation = useTimeValidation();

	// 時間操作・調整
	const timeActions = useTimeActions({
		startTime: state.startTime,
		endTime: state.endTime,
		actions,
		validation,
		videoDuration,
		currentTime,
		youtubePlayerRef,
	});

	return {
		...state,
		...actions,
		...timeActions,
		parseTimeString: validation.parseTimeString,
	};
}
