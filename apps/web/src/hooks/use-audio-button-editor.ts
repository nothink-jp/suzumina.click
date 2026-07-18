import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { useAudioButtonValidation } from "./use-audio-button-validation";
import { useTimeAdjustment } from "./use-time-adjustment";
import { useTimeHandlers } from "./use-time-handlers";
import { useYouTubePlayerManager } from "./use-youtube-player-manager";

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

	// プレビュー再生
	const previewRange = useCallback(() => {
		if (!youtubeManager.isPlayerReady) return;
		youtubeManager.playRange(timeAdjustment.startTime, timeAdjustment.endTime);
	}, [
		youtubeManager.playRange,
		youtubeManager.isPlayerReady,
		timeAdjustment.startTime,
		timeAdjustment.endTime,
	]);

	// 時間調整ハンドラー
	const timeHandlers = useTimeHandlers({
		timeAdjustment,
		onPreviewRange: previewRange,
	});

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
		validation,
		hasChanges,
	};
}
