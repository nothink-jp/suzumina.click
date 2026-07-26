"use client";

import { formatTimestamp } from "@suzumina.click/shared-types";
import { TimeDisplay } from "@suzumina.click/ui/components/custom/time-display";
import { ValidationMessages } from "@suzumina.click/ui/components/custom/validation-message";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Checkbox } from "@suzumina.click/ui/components/ui/checkbox";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Clock, MousePointer, Play, Square } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { ClipExploreLane } from "./clip-explore-lane";
import { ClipTrimLane } from "./clip-trim-lane";

/** ズーム段階（レーンの片幅・秒） */
const ZOOM_LEVELS = [5, 15, 60] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/**
 * クリップ境界が表示窓の外へ出たときの新しい中心を返す（窓内なら null = シフト不要）。
 * 窓に収まる長さなら最小シフト、収まらない長さなら「動いた側の境界」を中心にする。
 */
function resolveViewCenterShift(params: {
	startTime: number;
	endTime: number;
	prevStartTime: number;
	prevEndTime: number;
	viewCenter: number;
	halfWindow: number;
}): number | null {
	const { startTime, endTime, prevStartTime, prevEndTime, viewCenter, halfWindow } = params;
	const lo = viewCenter - halfWindow;
	const hi = viewCenter + halfWindow;

	if (endTime - startTime <= halfWindow * 2) {
		// クリップ全体が窓に収まるサイズなら、はみ出した側へ最小シフト
		if (startTime < lo) return viewCenter + (startTime - lo);
		if (endTime > hi) return viewCenter + (endTime - hi);
		return null;
	}
	// 窓より長いクリップ（±5秒ズームで60秒クリップ等）は「動いた側の境界」を窓内へ
	const changed =
		startTime !== prevStartTime ? startTime : endTime !== prevEndTime ? endTime : null;
	if (changed === null || (changed >= lo && changed <= hi)) return null;
	return changed;
}

/** [ ] キーによるズームの遷移先（[ = 広く / ] = 狭く） */
function nextZoomLevel(current: ZoomLevel, widen: boolean): ZoomLevel {
	const index = ZOOM_LEVELS.indexOf(current);
	const nextIndex = widen ? Math.min(index + 1, ZOOM_LEVELS.length - 1) : Math.max(index - 1, 0);
	return ZOOM_LEVELS[nextIndex] ?? 15;
}

interface PanelHotkeyContext {
	currentTime: number;
	videoDuration: number;
	audition: AuditionControls;
	onSeek: (time: number) => void;
}

/**
 * パネルのグローバルショートカット: ←→（0.1秒 / Shift で1秒）で再生位置を微動、
 * Space でループ試聴トグル、[ ] でズーム。ガードの正本は matchShortcutKey
 */
function createPanelHotkeyHandler(
	latestRef: React.RefObject<PanelHotkeyContext>,
	setHalfWindow: (updater: (prev: ZoomLevel) => ZoomLevel) => void,
): (event: KeyboardEvent) => void {
	return (event) => {
		const hotkey = matchShortcutKey(event, ["arrowleft", "arrowright", " ", "[", "]"]);
		if (!hotkey) return;
		event.preventDefault();
		const latest = latestRef.current;
		if (hotkey === "arrowleft" || hotkey === "arrowright") {
			const step = (event.shiftKey ? 1 : 0.1) * (hotkey === "arrowleft" ? -1 : 1);
			latest.onSeek(
				roundTenth(Math.max(0, Math.min(latest.currentTime + step, latest.videoDuration))),
			);
			return;
		}
		if (hotkey === " ") {
			latest.audition.onToggleLoop();
			return;
		}
		// functional update: 連続入力でも stale な現在値を掴まない
		setHalfWindow((prev) => nextZoomLevel(prev, hotkey === "["));
	};
}

export interface AuditionControls {
	/** ループ試聴中か（表示とトグルの状態） */
	isLooping: boolean;
	prerollEnabled: boolean;
	onToggleLoop: () => void;
	onPlayHead: () => void;
	onPlayTail: () => void;
	onTogglePreroll: () => void;
}

interface TimeControlPanelProps {
	// 時間状態
	startTime: number;
	endTime: number;
	currentTime: number;
	videoDuration: number;
	startTimeInput: string;
	endTimeInput: string;
	isEditingStartTime: boolean;
	isEditingEndTime: boolean;

	// テキスト入力
	onStartTimeInputChange: (value: string) => void;
	onEndTimeInputChange: (value: string) => void;
	onStartTimeBlur: () => void;
	onEndTimeBlur: () => void;
	onStartTimeKeyDown: (e: React.KeyboardEvent) => void;
	onEndTimeKeyDown: (e: React.KeyboardEvent) => void;

	// 境界操作
	onSetCurrentAsStart: () => void;
	onSetCurrentAsEnd: () => void;
	onAdjustStartTime: (delta: number) => void;
	onAdjustEndTime: (delta: number) => void;
	onSetStartTime: (time: number) => void;
	onSetEndTime: (time: number) => void;
	onSeek: (time: number) => void;

	// 試聴
	audition: AuditionControls;

	// 探索レーンの目印（SPR-289）。省略時はレーンだけ表示する（編集画面など）
	madeMarks?: number[];
	draftMarks?: number[];

	// UI状態
	isCreating: boolean;
}

interface BoundaryNudgeRowProps {
	label: string;
	timeValue: number;
	timeInput: string;
	isEditing: boolean;
	disabled: boolean;
	onAdjust: (delta: number) => void;
	onInputChange: (value: string) => void;
	onBlur: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

/** 境界の微調整行: [-1][-0.1][時刻入力][+0.1][+1]（44px ターゲット・スロットルなし連打可） */
function BoundaryNudgeRow({
	label,
	timeValue,
	timeInput,
	isEditing,
	disabled,
	onAdjust,
	onInputChange,
	onBlur,
	onKeyDown,
}: BoundaryNudgeRowProps) {
	const nudgeButton = (delta: number) => (
		<Button
			variant="outline"
			size="sm"
			onClick={() => onAdjust(delta)}
			disabled={disabled}
			className="h-11 w-11 px-0 text-sm font-medium"
			aria-label={`${label}を${delta > 0 ? `${delta}秒後ろへ` : `${-delta}秒前へ`}`}
		>
			{delta > 0 ? `+${delta}` : delta}
		</Button>
	);

	return (
		<div className="flex items-center gap-1.5">
			<span className="w-7 shrink-0 text-xs text-muted-foreground">{label}</span>
			{nudgeButton(-1)}
			{nudgeButton(-0.1)}
			<Input
				type="text"
				value={isEditing ? timeInput : formatTimestamp(timeValue)}
				onChange={(e) => onInputChange(e.target.value)}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				disabled={disabled}
				aria-label={`${label}時間`}
				className="h-11 min-w-0 flex-1 border-0 bg-muted/30 text-center font-mono text-base font-semibold text-primary focus:bg-background"
				placeholder={timeValue >= 3600 ? "0:00:00.0" : "0:00.0"}
			/>
			{nudgeButton(0.1)}
			{nudgeButton(1)}
		</div>
	);
}

/**
 * 切り抜き範囲の操作パネル（SPR-288 で全面刷新）。
 * トリムレーン（ズーム可能な拡大タイムライン）＋境界微調整＋ループ試聴を1枚にまとめる。
 * キーボード: I/O は use-audio-button-editor 側、←→/Space/[ ] はこのパネルが持つ。
 */
export function TimeControlPanel({
	startTime,
	endTime,
	currentTime,
	videoDuration,
	startTimeInput,
	endTimeInput,
	isEditingStartTime,
	isEditingEndTime,
	onStartTimeInputChange,
	onEndTimeInputChange,
	onStartTimeBlur,
	onEndTimeBlur,
	onStartTimeKeyDown,
	onEndTimeKeyDown,
	onSetCurrentAsStart,
	onSetCurrentAsEnd,
	onAdjustStartTime,
	onAdjustEndTime,
	onSetStartTime,
	onSetEndTime,
	onSeek,
	audition,
	madeMarks = [],
	draftMarks = [],
	isCreating,
}: TimeControlPanelProps) {
	const prerollId = useId();
	const duration = roundTenth(endTime - startTime);

	// レーンの表示窓。中心はクリップ中央で初期化し、境界が窓外へ出たら最小シフトで追従する
	const [halfWindow, setHalfWindow] = useState<ZoomLevel>(15);
	const [viewCenter, setViewCenter] = useState(() => (startTime + endTime) / 2);
	const prevBoundsRef = useRef({ startTime, endTime });

	const clampCenter = useCallback(
		(center: number, half: number) => {
			if (videoDuration <= half * 2) return videoDuration / 2;
			return Math.max(half, Math.min(center, videoDuration - half));
		},
		[videoDuration],
	);

	useEffect(() => {
		const prev = prevBoundsRef.current;
		prevBoundsRef.current = { startTime, endTime };
		const next = resolveViewCenterShift({
			startTime,
			endTime,
			prevStartTime: prev.startTime,
			prevEndTime: prev.endTime,
			viewCenter,
			halfWindow,
		});
		if (next !== null) {
			setViewCenter(clampCenter(next, halfWindow));
		}
	}, [startTime, endTime, halfWindow, viewCenter, clampCenter]);

	// 入力値はショートカット発火時に最新を参照する（リスナーの張り直しを isCreating の変化時だけに抑える）
	const hotkeyRef = useRef({ currentTime, videoDuration, audition, onSeek });
	hotkeyRef.current = { currentTime, videoDuration, audition, onSeek };
	useEffect(() => {
		if (isCreating) return;
		const onKeyDown = createPanelHotkeyHandler(hotkeyRef, setHalfWindow);
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [isCreating]);

	const moveClip = useCallback(
		(nextStart: number, nextEnd: number) => {
			onSetStartTime(nextStart);
			onSetEndTime(nextEnd);
		},
		[onSetStartTime, onSetEndTime],
	);

	// 探索レーンのジャンプ: クリップを長さを保ったままその位置へ動かし、トリムレーンも追従させる。
	// プレイヤーのシークは editor 側の境界追従（調整のたび自動シーク）に任せる
	const handleExploreJump = useCallback(
		(time: number) => {
			const length = Math.max(roundTenth(endTime - startTime), 1);
			const nextStart = roundTenth(Math.max(0, Math.min(time, videoDuration - length)));
			onSetStartTime(nextStart);
			onSetEndTime(roundTenth(nextStart + length));
			setViewCenter(clampCenter(nextStart + length / 2, halfWindow));
		},
		[startTime, endTime, videoDuration, onSetStartTime, onSetEndTime, clampCenter, halfWindow],
	);

	return (
		<div className="space-y-3">
			{/* 再生位置と I/O 設定 */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<span className="hidden text-sm text-muted-foreground sm:inline">再生位置</span>
					<TimeDisplay
						time={currentTime}
						format="auto"
						className="font-mono text-base font-semibold text-primary"
					/>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onSetCurrentAsStart}
						disabled={isCreating}
						className="h-11"
					>
						<MousePointer className="mr-1 h-3 w-3" />
						開始時間に設定
						<kbd className="ml-1.5 hidden rounded border px-1 font-mono text-[10px] text-muted-foreground sm:inline">
							I
						</kbd>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onSetCurrentAsEnd}
						disabled={isCreating}
						className="h-11"
					>
						<MousePointer className="mr-1 h-3 w-3" />
						終了時間に設定
						<kbd className="ml-1.5 hidden rounded border px-1 font-mono text-[10px] text-muted-foreground sm:inline">
							O
						</kbd>
					</Button>
				</div>
			</div>

			{/* 動画全体の探索レーン（SPR-289） */}
			<div className="space-y-1.5">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-sm font-medium sm:text-base">動画全体から探す</span>
					<span className="text-xs text-muted-foreground">クリックでその位置へ</span>
				</div>
				<ClipExploreLane
					videoDuration={videoDuration}
					windowStart={viewCenter - halfWindow}
					windowEnd={viewCenter + halfWindow}
					madeMarks={madeMarks}
					draftMarks={draftMarks}
					disabled={isCreating}
					onJump={handleExploreJump}
				/>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
					{draftMarks.length > 0 && (
						<span className="flex items-center gap-1 whitespace-nowrap">
							<span className="inline-block h-2.5 w-1 rounded-full bg-heart" />
							下書き {draftMarks.length}
						</span>
					)}
					<span className="flex items-center gap-1 whitespace-nowrap">
						<span className="inline-block h-2.5 w-1 rounded-full bg-suzuka-600" />
						作成済み {madeMarks.length}
					</span>
					<span className="ml-auto whitespace-nowrap">▼ の枠内が下の拡大表示の範囲</span>
				</div>
			</div>

			{/* 切り抜き範囲: ズーム + トリムレーン */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-medium sm:text-base">切り抜き範囲</span>
					<div className="flex gap-1">
						{ZOOM_LEVELS.map((level) => (
							<Button
								key={level}
								variant={halfWindow === level ? "secondary" : "outline"}
								size="sm"
								onClick={() => setHalfWindow(level)}
								disabled={isCreating}
								aria-pressed={halfWindow === level}
								className="h-8 px-3 text-xs"
							>
								±{level}秒
							</Button>
						))}
					</div>
				</div>

				<ClipTrimLane
					startTime={startTime}
					endTime={endTime}
					currentTime={currentTime}
					videoDuration={videoDuration}
					viewCenter={viewCenter}
					halfWindow={halfWindow}
					disabled={isCreating}
					onChangeStart={onSetStartTime}
					onChangeEnd={onSetEndTime}
					onMoveClip={moveClip}
					onSeek={onSeek}
				/>

				{/* 境界の微調整 */}
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<BoundaryNudgeRow
						label="開始"
						timeValue={startTime}
						timeInput={startTimeInput}
						isEditing={isEditingStartTime}
						disabled={isCreating}
						onAdjust={onAdjustStartTime}
						onInputChange={onStartTimeInputChange}
						onBlur={onStartTimeBlur}
						onKeyDown={onStartTimeKeyDown}
					/>
					<BoundaryNudgeRow
						label="終了"
						timeValue={endTime}
						timeInput={endTimeInput}
						isEditing={isEditingEndTime}
						disabled={isCreating}
						onAdjust={onAdjustEndTime}
						onInputChange={onEndTimeInputChange}
						onBlur={onEndTimeBlur}
						onKeyDown={onEndTimeKeyDown}
					/>
				</div>
			</div>

			{/* 長さ表示 */}
			<div
				className={`rounded-lg p-3 text-center sm:p-4 ${
					startTime >= endTime || duration > 60
						? "bg-destructive/10 border border-destructive/20"
						: "bg-primary/10 border border-primary/20"
				}`}
			>
				<p className="text-sm sm:text-base">
					<span className="text-muted-foreground">切り抜き時間: </span>
					<strong
						className={startTime >= endTime || duration > 60 ? "text-destructive" : "text-primary"}
					>
						{startTime >= endTime ? "無効" : `${duration.toFixed(1)}秒`}
					</strong>
				</p>
				<div className="mt-2 space-y-1">
					<ValidationMessages.TimeRange isVisible={startTime >= endTime} compact />
					<ValidationMessages.MaxDuration
						maxSeconds={60}
						isVisible={startTime < endTime && duration > 60}
						compact
					/>
					<ValidationMessages.MinDuration
						minSeconds={1}
						isVisible={startTime < endTime && duration < 1}
						compact
					/>
				</div>
			</div>

			{/* 試聴 */}
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant={audition.isLooping ? "secondary" : "default"}
					onClick={audition.onToggleLoop}
					disabled={isCreating || startTime >= endTime}
					className="h-11 min-h-[44px] px-4 font-medium"
					size="lg"
				>
					{audition.isLooping ? (
						<>
							<Square className="mr-2 h-4 w-4" />
							停止
						</>
					) : (
						<>
							<Play className="mr-2 h-4 w-4" />
							区間をループ再生
						</>
					)}
				</Button>
				<Button
					variant="outline"
					onClick={audition.onPlayHead}
					disabled={isCreating || startTime >= endTime}
					className="h-11 min-h-[44px]"
				>
					頭を聴く
				</Button>
				<Button
					variant="outline"
					onClick={audition.onPlayTail}
					disabled={isCreating || startTime >= endTime}
					className="h-11 min-h-[44px]"
				>
					末尾を聴く
				</Button>
				<label
					htmlFor={prerollId}
					className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
				>
					<Checkbox
						id={prerollId}
						checked={audition.prerollEnabled}
						onCheckedChange={audition.onTogglePreroll}
						disabled={isCreating}
					/>
					1.5秒前から鳴らす
				</label>
			</div>

			{/* キーボード前提の端末だけに出すヒント */}
			<div className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:flex">
				<span>
					<strong className="text-foreground">I</strong> /{" "}
					<strong className="text-foreground">O</strong> 再生位置を開始・終了に
				</span>
				<span>
					<strong className="text-foreground">← →</strong> 0.1秒
				</span>
				<span>
					<strong className="text-foreground">Shift + ← →</strong> 1秒
				</span>
				<span>
					<strong className="text-foreground">Space</strong> ループ再生
				</span>
				<span>
					<strong className="text-foreground">[ ]</strong> ズーム
				</span>
			</div>
		</div>
	);
}
