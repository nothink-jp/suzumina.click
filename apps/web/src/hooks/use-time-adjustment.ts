import { formatTimestamp } from "@suzumina.click/shared-types";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { useCallback, useRef, useState } from "react";

interface DebugEntry {
	timestamp: string;
	action: string;
	before: { start: number; end: number };
	after: { start: number; end: number };
	delta: number;
	expected: number;
	actual: number;
	isValid: boolean;
	videoDuration?: number;
	clampDetails?: {
		newTime: number;
		videoDuration: number;
		clampedResult: number;
		floatingPointCheck: {
			rawCalculation: number;
			roundedCalculation: number;
			difference: number;
		};
	};
}

interface TimeAdjustmentHook {
	startTime: number;
	endTime: number;
	startTimeInput: string;
	endTimeInput: string;
	isEditingStartTime: boolean;
	isEditingEndTime: boolean;
	isAdjusting: boolean;
	setStartTime: (time: number) => void;
	setEndTime: (time: number) => void;
	setStartTimeInput: (input: string) => void;
	setEndTimeInput: (input: string) => void;
	setIsEditingStartTime: (editing: boolean) => void;
	setIsEditingEndTime: (editing: boolean) => void;
	adjustStartTime: (deltaSeconds: number) => void;
	adjustEndTime: (deltaSeconds: number) => void;
	setCurrentAsStart: () => void;
	setCurrentAsEnd: () => void;
	parseTimeString: (timeStr: string) => number | null;
}

interface UseTimeAdjustmentProps {
	videoDuration: number;
	currentTime: number;
	youtubePlayerRef: React.RefObject<YTPlayer | null>;
	debugMode?: boolean;
	onDebugLog?: (entry: DebugEntry) => void;
}

export function useTimeAdjustment({
	videoDuration,
	currentTime,
	youtubePlayerRef,
	debugMode = false,
	onDebugLog,
}: UseTimeAdjustmentProps): TimeAdjustmentHook {
	// 状態管理
	const [startTime, setStartTime] = useState(0);
	const [endTime, setEndTime] = useState(0);
	const [startTimeInput, setStartTimeInput] = useState(formatTimestamp(0));
	const [endTimeInput, setEndTimeInput] = useState(formatTimestamp(0));
	const [isEditingStartTime, setIsEditingStartTime] = useState(false);
	const [isEditingEndTime, setIsEditingEndTime] = useState(false);
	const [isAdjusting, setIsAdjusting] = useState(false);

	// refs
	const lastAdjustmentRef = useRef<number>(0);
	const startTimeRef = useRef<number>(0);
	const endTimeRef = useRef<number>(0);

	// refを同期的に更新
	const updateRefs = useCallback(() => {
		startTimeRef.current = startTime;
		endTimeRef.current = endTime;
	}, [startTime, endTime]);

	// refを更新するためのuseEffect代替
	updateRefs();

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

	// デバッグエントリ作成ヘルパー
	const createDebugEntry = useCallback(
		(
			action: string,
			before: { start: number; end: number },
			after: { start: number; end: number },
			deltaSeconds: number,
			expectedTime: number,
			actualTime: number,
		) => ({
			timestamp: new Date().toISOString(),
			action,
			before,
			after,
			delta: deltaSeconds,
			expected: expectedTime,
			actual: actualTime,
			isValid: Math.abs(actualTime - Math.max(0, Math.min(expectedTime, videoDuration))) < 0.01,
			videoDuration,
			clampDetails: {
				newTime: Math.round((before.start + deltaSeconds) * 10) / 10,
				videoDuration,
				clampedResult: Math.min(Math.round((before.start + deltaSeconds) * 10) / 10, videoDuration),
				floatingPointCheck: {
					rawCalculation: before.start + deltaSeconds,
					roundedCalculation: Math.round((before.start + deltaSeconds) * 10) / 10,
					difference: Math.abs(
						before.start + deltaSeconds - Math.round((before.start + deltaSeconds) * 10) / 10,
					),
				},
			},
		}),
		[videoDuration],
	);

	// 時間調整関数
	const adjustStartTime = useCallback(
		(deltaSeconds: number) => {
			// デバウンス処理
			const now = Date.now();
			if (now - lastAdjustmentRef.current < 100) {
				if (debugMode) {
					// biome-ignore lint/suspicious/noConsole: デバッグ用のログ出力
					console.log("🔧 StartTime Adjustment DEBOUNCED:", {
						deltaSeconds,
						timeDiff: now - lastAdjustmentRef.current,
					});
				}
				return;
			}
			lastAdjustmentRef.current = now;

			// UI状態を更新
			setIsAdjusting(true);
			setTimeout(() => setIsAdjusting(false), 100);

			// 最新の時間値を使用
			const currentStartTime = startTimeRef.current;
			const currentEndTime = endTimeRef.current;
			const before = { start: currentStartTime, end: currentEndTime };
			const expectedTime = currentStartTime + deltaSeconds;
			const newTime = Math.round((currentStartTime + deltaSeconds) * 10) / 10;
			const clampedTime = Math.max(0, Math.min(newTime, videoDuration));

			// デバッグ情報を記録
			if (debugMode && onDebugLog) {
				const debugEntry = createDebugEntry(
					`adjustStartTime(${deltaSeconds})`,
					before,
					{ start: clampedTime, end: currentEndTime },
					deltaSeconds,
					expectedTime,
					clampedTime,
				);
				onDebugLog(debugEntry);
			}

			setStartTime(clampedTime);
			setStartTimeInput(formatTimestamp(clampedTime));
		},
		[videoDuration, debugMode, onDebugLog, createDebugEntry],
	);

	const adjustEndTime = useCallback(
		(deltaSeconds: number) => {
			// デバウンス処理
			const now = Date.now();
			if (now - lastAdjustmentRef.current < 100) {
				if (debugMode) {
					// biome-ignore lint/suspicious/noConsole: デバッグ用のログ出力
					console.log("🔧 EndTime Adjustment DEBOUNCED:", {
						deltaSeconds,
						timeDiff: now - lastAdjustmentRef.current,
					});
				}
				return;
			}
			lastAdjustmentRef.current = now;

			// UI状態を更新
			setIsAdjusting(true);
			setTimeout(() => setIsAdjusting(false), 100);

			// 最新の時間値を使用
			const currentStartTime = startTimeRef.current;
			const currentEndTime = endTimeRef.current;
			const before = { start: currentStartTime, end: currentEndTime };
			const expectedTime = currentEndTime + deltaSeconds;
			const newTime = Math.round((currentEndTime + deltaSeconds) * 10) / 10;
			const clampedTime = Math.max(0, Math.min(newTime, videoDuration));

			// デバッグ情報を記録
			if (debugMode && onDebugLog) {
				const debugEntry = createDebugEntry(
					`adjustEndTime(${deltaSeconds})`,
					before,
					{ start: currentStartTime, end: clampedTime },
					deltaSeconds,
					expectedTime,
					clampedTime,
				);
				onDebugLog(debugEntry);
			}

			setEndTime(clampedTime);
			setEndTimeInput(formatTimestamp(clampedTime));
		},
		[videoDuration, debugMode, onDebugLog, createDebugEntry],
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
				// エラーは無視
			}
		}
		setStartTime(time);
		setStartTimeInput(formatTimestamp(time));
		startTimeRef.current = time;
	}, [currentTime, youtubePlayerRef]);

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
				// エラーは無視
			}
		}

		setEndTime(time);
		setEndTimeInput(formatTimestamp(time));
		endTimeRef.current = time;
	}, [currentTime, youtubePlayerRef]);

	return {
		startTime,
		endTime,
		startTimeInput,
		endTimeInput,
		isEditingStartTime,
		isEditingEndTime,
		isAdjusting,
		setStartTime,
		setEndTime,
		setStartTimeInput,
		setEndTimeInput,
		setIsEditingStartTime,
		setIsEditingEndTime,
		adjustStartTime,
		adjustEndTime,
		setCurrentAsStart,
		setCurrentAsEnd,
		parseTimeString,
	};
}
