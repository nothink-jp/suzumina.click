"use client";

import { formatTimestamp } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptUtterance } from "@/lib/gemini/transcription-core";
import { formatSeconds } from "@/utils/format-seconds";

/** 切り抜き長の制約（バリデーションの正本は use-audio-button-validation。ドラッグ時の先行クランプ用） */
const MIN_CLIP_SECONDS = 1;
const MAX_CLIP_SECONDS = 60;

/** ズーム段階（±秒）ごとの目盛り間隔 */
const DEFAULT_TICK_STEP = { major: 5, minor: 1 };
const TICK_STEPS = new Map<number, { major: number; minor: number }>([
	[5, { major: 1, minor: 0.2 }],
	[15, DEFAULT_TICK_STEP],
	[60, { major: 15, minor: 5 }],
]);

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/** 開始境界のクランプ: 0 以上・終了の1秒前まで */
function clampStartBoundary(time: number, endTime: number, videoDuration: number): number {
	return Math.max(0, Math.min(roundTenth(time), endTime - MIN_CLIP_SECONDS, videoDuration));
}

/** 終了境界のクランプ: 開始の1秒後〜開始+60秒・動画長まで */
function clampEndBoundary(time: number, startTime: number, videoDuration: number): number {
	return Math.min(
		videoDuration,
		Math.max(roundTenth(time), startTime + MIN_CLIP_SECONDS),
		startTime + MAX_CLIP_SECONDS,
	);
}

/** ←→ キーによる境界の移動先（対象キーでなければ null） */
function boundaryTimeForKey(
	event: React.KeyboardEvent,
	kind: "start" | "end",
	startTime: number,
	endTime: number,
	videoDuration: number,
): number | null {
	const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
	if (direction === 0) return null;
	const delta = direction * (event.shiftKey ? 1 : 0.1);
	if (kind === "start") {
		return clampStartBoundary(startTime + delta, endTime, videoDuration);
	}
	return clampEndBoundary(endTime + delta, startTime, videoDuration);
}

type DragKind = "start" | "end" | "move";

interface ClipTrimLaneProps {
	startTime: number;
	endTime: number;
	currentTime: number;
	videoDuration: number;
	/** レーンが表示する範囲の中心（秒） */
	viewCenter: number;
	/** レーンが表示する範囲の片幅（秒）: 5 / 15 / 60 */
	halfWindow: number;
	disabled?: boolean;
	onChangeStart: (time: number) => void;
	onChangeEnd: (time: number) => void;
	/** 中央ドラッグ: 長さを保ったまま開始・終了を同時に動かす */
	onMoveClip: (startTime: number, endTime: number) => void;
	/** レーン余白クリック: 再生位置をその時刻へ */
	onSeek: (time: number) => void;
	/** 読み込み済みの発話（SPR-292）。渡すと発話行が出てレーンが縦に広がる */
	utterances?: TranscriptUtterance[];
	/** 発話クリック（extend=Shift クリック: 現在区間を発話まで広げる） */
	onUtteranceClick?: (utterance: TranscriptUtterance, extend: boolean) => void;
}

/**
 * 切り抜き範囲のトリムレーン（SPR-288）。
 * シークバー（1px≈17.5秒/4h動画）と ±0.1 ボタンの間を埋める拡大タイムライン。
 * ドラッグ中に窓の外へ出た分は親の viewCenter 追従（TimeControlPanel 側の effect）でパンされる。
 */
export function ClipTrimLane({
	startTime,
	endTime,
	currentTime,
	videoDuration,
	viewCenter,
	halfWindow,
	disabled = false,
	onChangeStart,
	onChangeEnd,
	onMoveClip,
	onSeek,
	utterances,
	onUtteranceClick,
}: ClipTrimLaneProps) {
	// 発話行の有無でレーンの高さとクリップ位置が変わる（編集画面は発話なしの従来レイアウト）
	const hasUtteranceRow = utterances !== undefined;
	const laneRef = useRef<HTMLDivElement | null>(null);
	const [drag, setDrag] = useState<{ kind: DragKind; grabOffset: number } | null>(null);
	// ドラッグを離した直後に lane の click が発火して意図せずシークするのを抑止する
	const dragMovedRef = useRef(false);
	const suppressClickRef = useRef(false);

	// ドラッグ処理はレーン矩形と最新の境界値を都度参照する（リスナー張り直しを drag 変化時だけに抑える）
	const stateRef = useRef({ startTime, endTime, viewCenter, halfWindow, videoDuration });
	stateRef.current = { startTime, endTime, viewCenter, halfWindow, videoDuration };
	const handlersRef = useRef({ onChangeStart, onChangeEnd, onMoveClip });
	handlersRef.current = { onChangeStart, onChangeEnd, onMoveClip };

	const timeAtClientX = useCallback((clientX: number) => {
		const lane = laneRef.current;
		const { viewCenter: center, halfWindow: half } = stateRef.current;
		if (!lane) return center;
		const rect = lane.getBoundingClientRect();
		if (rect.width <= 0) return center;
		const ratio = (clientX - rect.left) / rect.width;
		return center - half + ratio * half * 2;
	}, []);

	useEffect(() => {
		if (!drag) return;
		const onPointerMove = (event: PointerEvent) => {
			event.preventDefault();
			dragMovedRef.current = true;
			const { startTime: start, endTime: end, videoDuration: duration } = stateRef.current;
			const time = timeAtClientX(event.clientX);
			if (drag.kind === "start") {
				handlersRef.current.onChangeStart(clampStartBoundary(time, end, duration));
			} else if (drag.kind === "end") {
				handlersRef.current.onChangeEnd(clampEndBoundary(time, start, duration));
			} else {
				const length = end - start;
				const nextStart = Math.max(
					0,
					Math.min(roundTenth(time - drag.grabOffset), duration - length),
				);
				handlersRef.current.onMoveClip(nextStart, roundTenth(nextStart + length));
			}
		};
		const onPointerUp = () => {
			if (dragMovedRef.current) {
				suppressClickRef.current = true;
				// click が続かないケース（レーン外で離した等）でも次の操作を食わないよう即時解除を予約
				setTimeout(() => {
					suppressClickRef.current = false;
				}, 0);
			}
			setDrag(null);
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointercancel", onPointerUp);
		return () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
			document.removeEventListener("pointercancel", onPointerUp);
		};
	}, [drag, timeAtClientX]);

	const positionPercent = useCallback(
		(time: number) => ((time - (viewCenter - halfWindow)) / (halfWindow * 2)) * 100,
		[viewCenter, halfWindow],
	);

	const windowStart = viewCenter - halfWindow;
	const windowEnd = viewCenter + halfWindow;

	// 目盛り（絶対時刻）
	const steps = TICK_STEPS.get(halfWindow) ?? DEFAULT_TICK_STEP;
	const buildTicks = (step: number) => {
		const ticks: number[] = [];
		const first = Math.ceil(windowStart / step) * step;
		// 浮動小数の蓄積を避けるため index ベースで生成
		for (let i = 0; ; i++) {
			const t = first + i * step;
			if (t > windowEnd) break;
			if (t >= 0 && t <= videoDuration) ticks.push(roundTenth(t));
		}
		return ticks;
	};
	const majorTicks = buildTicks(steps.major);
	const minorTicks = buildTicks(steps.minor);

	const clipLeft = positionPercent(startTime);
	const clipRight = positionPercent(endTime);
	const playheadVisible = currentTime >= windowStart && currentTime <= windowEnd;

	const beginDrag = (kind: DragKind) => (event: React.PointerEvent) => {
		if (disabled) return;
		event.preventDefault();
		event.stopPropagation();
		dragMovedRef.current = false;
		const grabOffset = kind === "move" ? timeAtClientX(event.clientX) - startTime : 0;
		setDrag({ kind, grabOffset });
	};

	// ハンドルにフォーカスして ←→（Shift で1秒）でも境界を動かせる（role=slider の operability）
	const handleKeyAdjust = (kind: "start" | "end") => (event: React.KeyboardEvent) => {
		if (disabled) return;
		const next = boundaryTimeForKey(event, kind, startTime, endTime, videoDuration);
		if (next === null) return;
		event.preventDefault();
		// パネル側の document keydown（再生位置の微動）と二重処理しない
		event.stopPropagation();
		if (kind === "start") {
			onChangeStart(next);
		} else {
			onChangeEnd(next);
		}
	};

	const onLaneClick = (event: React.MouseEvent) => {
		if (disabled) return;
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}
		const time = timeAtClientX(event.clientX);
		onSeek(roundTenth(Math.max(0, Math.min(time, videoDuration))));
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: シーク操作はキーボードでは ←→ ショートカットが同機能を提供する
		// biome-ignore lint/a11y/noStaticElementInteractions: レーンはハンドル（role=slider）を内包するため button にできない。クリックシークは ←→ の補助操作
		<div
			ref={laneRef}
			data-testid="clip-trim-lane"
			onClick={onLaneClick}
			className={`relative overflow-hidden rounded-md border bg-muted/60 select-none ${hasUtteranceRow ? "h-32" : "h-24"}`}
			style={{ touchAction: "none" }}
		>
			{/* 動画範囲外（0 より前 / 末尾より後）の遮蔽 */}
			{windowStart < 0 && (
				<div
					className="absolute inset-y-0 left-0 bg-foreground/10"
					style={{ width: `${positionPercent(0)}%` }}
				/>
			)}
			{windowEnd > videoDuration && (
				<div
					className="absolute inset-y-0 right-0 bg-foreground/10"
					style={{ width: `${100 - positionPercent(videoDuration)}%` }}
				/>
			)}

			{minorTicks.map((t) => (
				<div
					key={`minor-${t}`}
					className="absolute top-5 bottom-0 w-px bg-border opacity-60"
					style={{ left: `${positionPercent(t)}%` }}
				/>
			))}
			{majorTicks.map((t) => (
				<div key={`major-${t}`}>
					<div
						className="absolute inset-y-0 w-px bg-border"
						style={{ left: `${positionPercent(t)}%` }}
					/>
					<div
						className="absolute top-0.5 translate-x-1 font-mono text-[11px] leading-none text-muted-foreground"
						style={{ left: `${positionPercent(t)}%` }}
					>
						{formatSeconds(t)}
					</div>
				</div>
			))}

			{/* 発話行（SPR-292）: クリックで区間スナップ・Shift で拡張 */}
			{hasUtteranceRow &&
				utterances
					.filter((u) => u.end > windowStart && u.start < windowEnd)
					.map((u) => {
						const left = Math.max(positionPercent(u.start), 0);
						const right = Math.min(positionPercent(u.end), 100);
						return (
							<button
								key={`utterance-${u.start}`}
								type="button"
								data-testid="lane-utterance"
								title={u.text}
								disabled={disabled}
								onClick={(event) => {
									// レーン背景のクリックシークを発火させない
									event.stopPropagation();
									onUtteranceClick?.(u, event.shiftKey);
								}}
								className="absolute top-5 flex h-[26px] items-center overflow-hidden rounded-sm border bg-card px-1 text-left font-normal text-[11px] whitespace-nowrap text-muted-foreground hover:border-suzuka-400 hover:text-foreground disabled:pointer-events-none"
								style={{ left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` }}
							>
								<span className="truncate">{u.text}</span>
							</button>
						);
					})}

			{/* クリップブロック */}
			<div
				className={`absolute bottom-0 border-y-2 border-suzuka-600 bg-suzuka-500/25 ${hasUtteranceRow ? "top-[52px]" : "top-5"}`}
				style={{
					left: `${clipLeft}%`,
					width: `${Math.max(clipRight - clipLeft, 0)}%`,
				}}
			>
				<div
					data-testid="clip-move-area"
					onPointerDown={beginDrag("move")}
					className={`absolute inset-0 flex items-center justify-center ${disabled ? "" : "cursor-grab"}`}
				>
					<span className="rounded-full border bg-card px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-sm">
						{`${roundTenth(endTime - startTime).toFixed(1)}秒`}
					</span>
				</div>
				<div
					data-testid="clip-start-handle"
					role="slider"
					tabIndex={disabled ? -1 : 0}
					aria-label="開始時間"
					aria-valuemin={0}
					aria-valuemax={endTime}
					aria-valuenow={startTime}
					onPointerDown={beginDrag("start")}
					onKeyDown={handleKeyAdjust("start")}
					className="absolute top-[-2px] bottom-[-2px] left-[-7px] flex w-3.5 cursor-ew-resize items-center justify-center rounded bg-suzuka-600 focus-visible:outline-3 focus-visible:outline-suzuka-400"
				>
					<span className="h-6 w-0.5 rounded-full bg-white/85" />
				</div>
				<div
					data-testid="clip-end-handle"
					role="slider"
					tabIndex={disabled ? -1 : 0}
					aria-label="終了時間"
					aria-valuemin={startTime}
					aria-valuemax={videoDuration}
					aria-valuenow={endTime}
					onPointerDown={beginDrag("end")}
					onKeyDown={handleKeyAdjust("end")}
					className="absolute top-[-2px] right-[-7px] bottom-[-2px] flex w-3.5 cursor-ew-resize items-center justify-center rounded bg-suzuka-600 focus-visible:outline-3 focus-visible:outline-suzuka-400"
				>
					<span className="h-6 w-0.5 rounded-full bg-white/85" />
				</div>
			</div>

			{/* 再生ヘッド */}
			{playheadVisible && (
				<div
					className="pointer-events-none absolute inset-y-0"
					style={{ left: `${positionPercent(currentTime)}%` }}
				>
					<div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" />
					<div className="absolute top-0 -translate-x-1/2 rounded-b bg-foreground px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold text-background whitespace-nowrap">
						{formatTimestamp(currentTime)}
					</div>
				</div>
			)}
		</div>
	);
}
