import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { useAudioButtonValidation } from "./use-audio-button-validation";
import { useTimeAdjustment } from "./use-time-adjustment";
import { useTimeHandlers } from "./use-time-handlers";
import { useYouTubePlayerManager } from "./use-youtube-player-manager";

/** プリロール（開始境界の何秒前から鳴らすか） */
const PREROLL_SECONDS = 1.5;
/** 頭/末尾試聴で境界の周辺を聴く長さ */
const EDGE_AUDITION_SECONDS = 2;
/** 境界調整→プレイヤー追従シークの trailing throttle */
const FOLLOW_SEEK_DELAY_MS = 200;

export interface AudioButtonEditorState {
	buttonText: string;
	description: string;
	tags: string[];
	isProcessing: boolean;
	error: string;
}

export interface AudioButtonEditorConfig {
	videoId: string;
	videoTitle?: string;
	videoDuration?: number;
	initialStartTime?: number;
	initialEndTime?: number;
	audioButton?: AudioButtonPlainObject; // 編集モードの場合に提供
}

/** 試聴（ループ再生・境界試聴・プリロール）の状態とアクション */
export interface AuditionState {
	isLooping: boolean;
	prerollEnabled: boolean;
	onToggleLoop: () => void;
	onPlayHead: () => void;
	onPlayTail: () => void;
	onTogglePreroll: () => void;
}

export interface AudioButtonEditorResult {
	// 基本状態
	state: AudioButtonEditorState;
	setState: {
		setButtonText: (buttonText: string) => void;
		setDescription: (description: string) => void;
		setTags: (tags: string[]) => void;
		setIsProcessing: (processing: boolean) => void;
		setError: (error: string) => void;
	};

	// YouTube Player管理
	youtubeManager: ReturnType<typeof useYouTubePlayerManager>;

	// 時間調整
	timeAdjustment: ReturnType<typeof useTimeAdjustment>;

	// 時間調整ハンドラー
	timeHandlers: ReturnType<typeof useTimeHandlers>;

	// 試聴
	audition: AuditionState;

	// バリデーション
	validation: ReturnType<typeof useAudioButtonValidation>;

	// 変更検出（編集モードの場合）
	hasChanges: boolean;
}

/**
 * 音声ボタン作成・編集の共通ロジックを提供するフック
 */
export function useAudioButtonEditor(config: AudioButtonEditorConfig): AudioButtonEditorResult {
	const {
		videoId,
		videoTitle: _videoTitle,
		videoDuration = 600,
		initialStartTime = 0,
		initialEndTime,
		audioButton,
	} = config;

	// 基本情報の状態（編集モードの場合は既存データで初期化）
	const [buttonText, setButtonText] = useState(audioButton?.buttonText || "");
	const [description, setDescription] = useState(audioButton?.description || "");
	const [tags, setTags] = useState<string[]>(audioButton?.tags || []);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState("");

	const youtubeManager = useYouTubePlayerManager({
		initialVideoId: videoId,
	});

	// 時間調整機能
	const timeAdjustmentProps = useMemo(
		() => ({
			videoDuration: youtubeManager.videoDuration || videoDuration,
			currentTime: youtubeManager.currentTime,
			youtubePlayerRef: youtubeManager.youtubePlayerRef,
			initialStartTime: audioButton?.startTime || initialStartTime,
			initialEndTime: audioButton?.endTime || initialEndTime || initialStartTime + 10,
		}),
		[
			youtubeManager.videoDuration,
			videoDuration,
			youtubeManager.youtubePlayerRef,
			audioButton?.endTime,
			audioButton?.startTime,
			initialEndTime,
			initialStartTime,
			youtubeManager.currentTime,
		],
	);

	const timeAdjustment = useTimeAdjustment(timeAdjustmentProps);

	// 時間調整ハンドラー
	const timeHandlers = useTimeHandlers({ timeAdjustment });

	// ---- 試聴（SPR-288）----
	// プリロール: 開始境界の判定は直前の文脈込みで聴かないと「言い始めが切れてる」が分からない
	const [prerollEnabled, setPrerollEnabled] = useState(true);
	const preroll = prerollEnabled ? PREROLL_SECONDS : 0;
	const isLooping = youtubeManager.clipPlayback.isActive && youtubeManager.clipPlayback.isLoop;

	const { startClip, stopClip, updateClipBounds, seekTo } = youtubeManager;
	const { startTime, endTime } = timeAdjustment;

	const onToggleLoop = useCallback(() => {
		if (isLooping) {
			stopClip();
			return;
		}
		startClip(startTime - preroll, endTime, { loop: true });
	}, [isLooping, stopClip, startClip, startTime, endTime, preroll]);

	// 頭を聴く: 開始境界の前後だけを1回再生（プリロール込み）
	const onPlayHead = useCallback(() => {
		startClip(startTime - preroll, Math.min(startTime + EDGE_AUDITION_SECONDS, endTime), {
			loop: false,
		});
	}, [startClip, startTime, endTime, preroll]);

	// 末尾を聴く: 終了境界の手前だけを1回再生し、境界ちょうどで止める
	const onPlayTail = useCallback(() => {
		startClip(Math.max(startTime, endTime - EDGE_AUDITION_SECONDS), endTime, { loop: false });
	}, [startClip, startTime, endTime]);

	const audition: AuditionState = {
		isLooping,
		prerollEnabled,
		onToggleLoop,
		onPlayHead,
		onPlayTail,
		onTogglePreroll: () => setPrerollEnabled((prev) => !prev),
	};

	// 境界を調整するたびプレイヤーを追従シークさせる（デザイン確定事項: 耳での即時判定）。
	// ドラッグの連続変更で iframe に seekTo を乱射しないよう trailing 200ms でまとめる。
	// ループ試聴中は範囲の正本（clipRef）も即時更新し、シーク先は「聴き直しに最短の位置」にする
	const prevTimesRef = useRef({ start: startTime, end: endTime });
	const followSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		const prev = prevTimesRef.current;
		prevTimesRef.current = { start: startTime, end: endTime };
		const startChanged = startTime !== prev.start;
		const endChanged = endTime !== prev.end;
		if ((!startChanged && !endChanged) || !youtubeManager.isPlayerReady) {
			return;
		}
		if (isLooping) {
			updateClipBounds(startTime - preroll, endTime);
		}
		if (followSeekTimeoutRef.current) {
			clearTimeout(followSeekTimeoutRef.current);
		}
		followSeekTimeoutRef.current = setTimeout(() => {
			const target = startChanged
				? Math.max(0, startTime - (isLooping ? preroll : 0))
				: isLooping
					? Math.max(startTime, endTime - EDGE_AUDITION_SECONDS)
					: endTime;
			seekTo(target);
		}, FOLLOW_SEEK_DELAY_MS);
	}, [
		startTime,
		endTime,
		youtubeManager.isPlayerReady,
		isLooping,
		preroll,
		updateClipBounds,
		seekTo,
	]);
	useEffect(() => {
		return () => {
			if (followSeekTimeoutRef.current) {
				clearTimeout(followSeekTimeoutRef.current);
			}
		};
	}, []);

	// バリデーション
	const validation = useAudioButtonValidation({
		title: buttonText,
		startTime: timeAdjustment.startTime,
		endTime: timeAdjustment.endTime,
		tags,
		description,
	});

	// I/O キーで再生位置を開始/終了時間に設定（SPR-266 区間指定UX）。ガードの正本は matchShortcutKey。
	// 処理中（作成/更新中）はボタン disabled と挙動を揃えて無効化する。
	// setCurrentAsStart/End は currentTime 依存で毎再生ティックに再生成されるため、
	// ref 経由で最新を呼び、リスナーの張り直しを isProcessing の変化時だけに抑える。
	const hotkeyActionsRef = useRef({
		setCurrentAsStart: timeAdjustment.setCurrentAsStart,
		setCurrentAsEnd: timeAdjustment.setCurrentAsEnd,
	});
	hotkeyActionsRef.current = {
		setCurrentAsStart: timeAdjustment.setCurrentAsStart,
		setCurrentAsEnd: timeAdjustment.setCurrentAsEnd,
	};
	useEffect(() => {
		if (isProcessing) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			const hotkey = matchShortcutKey(event, ["i", "o"]);
			if (!hotkey) {
				return;
			}
			event.preventDefault();
			if (hotkey === "i") {
				hotkeyActionsRef.current.setCurrentAsStart();
			} else {
				hotkeyActionsRef.current.setCurrentAsEnd();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [isProcessing]);

	// 変更があるかチェック（編集モードの場合）
	const hasChanges = useMemo(() => {
		if (!audioButton) return false;

		return (
			buttonText !== audioButton.buttonText ||
			description !== (audioButton.description || "") ||
			JSON.stringify(tags) !== JSON.stringify(audioButton.tags || []) ||
			timeAdjustment.startTime !== audioButton.startTime ||
			timeAdjustment.endTime !== audioButton.endTime
		);
	}, [
		audioButton,
		buttonText,
		description,
		tags,
		timeAdjustment.startTime,
		timeAdjustment.endTime,
	]);

	useEffect(() => {
		return () => {
			// Cleanup handled by YouTube manager
		};
	}, []);

	return {
		state: {
			buttonText,
			description,
			tags,
			isProcessing,
			error,
		},
		setState: {
			setButtonText,
			setDescription,
			setTags,
			setIsProcessing,
			setError,
		},
		youtubeManager,
		timeAdjustment,
		timeHandlers,
		audition,
		validation,
		hasChanges,
	};
}
