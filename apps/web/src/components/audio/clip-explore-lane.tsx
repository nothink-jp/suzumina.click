"use client";

import { formatSeconds } from "@/utils/format-seconds";

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/** 目盛り間隔の候補（秒）。ラベルが8本以下に収まる最小の間隔を選ぶ */
const TICK_STEP_CANDIDATES = [600, 1800, 3600, 7200, 14400];
const MAX_TICKS = 8;

function pickTickStep(videoDuration: number): number {
	for (const step of TICK_STEP_CANDIDATES) {
		if (videoDuration / step <= MAX_TICKS) return step;
	}
	return TICK_STEP_CANDIDATES[TICK_STEP_CANDIDATES.length - 1] ?? 14400;
}

interface ClipExploreLaneProps {
	videoDuration: number;
	/** トリムレーンが拡大表示している範囲（窓インジケータの描画用） */
	windowStart: number;
	windowEnd: number;
	/** この動画の作成済みボタンの開始時刻 */
	madeMarks?: number[];
	/** 自分の下書きの開始時刻 */
	draftMarks?: number[];
	disabled?: boolean;
	/** クリックでその位置へジャンプ（クリップ移動＋トリムレーン追従は親が行う） */
	onJump: (time: number) => void;
}

/**
 * 動画全体の探索レーン(SPR-289)。
 * 1px ≈ 十数秒の粗いスケールで「どこを切るか」の当たりをつける段。細部はトリムレーン
 * （clip-trim-lane）が受け持つ二段スケールの上段。作成済み・下書きの目印で重複作成も防ぐ。
 */
export function ClipExploreLane({
	videoDuration,
	windowStart,
	windowEnd,
	madeMarks = [],
	draftMarks = [],
	disabled = false,
	onJump,
}: ClipExploreLaneProps) {
	const positionPercent = (time: number) => (videoDuration > 0 ? (time / videoDuration) * 100 : 0);

	const tickStep = pickTickStep(videoDuration);
	const ticks: number[] = [];
	for (let t = tickStep; t < videoDuration; t += tickStep) {
		ticks.push(t);
	}

	const windowLeft = Math.max(positionPercent(windowStart), 0);
	const windowRight = Math.min(positionPercent(windowEnd), 100);
	const windowCenter = positionPercent((windowStart + windowEnd) / 2);

	// 同一時刻のマークは重なって見分けがつかないため重複排除（key の一意性も兼ねる）
	const uniqueDraftMarks = [...new Set(draftMarks)];
	const uniqueMadeMarks = [...new Set(madeMarks)];

	const onLaneClick = (event: React.MouseEvent<HTMLDivElement>) => {
		if (disabled) return;
		const rect = event.currentTarget.getBoundingClientRect();
		if (rect.width <= 0) return;
		const ratio = (event.clientX - rect.left) / rect.width;
		onJump(roundTenth(Math.max(0, Math.min(ratio * videoDuration, videoDuration))));
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: ジャンプはキーボードでは ←→ シークと I/O が同機能を提供する
		// biome-ignore lint/a11y/noStaticElementInteractions: 目印と窓インジケータを内包する帯のため button にできない。クリックは補助操作
		<div
			data-testid="clip-explore-lane"
			onClick={onLaneClick}
			className={`relative h-14 overflow-hidden rounded-md bg-muted select-none sm:h-16 ${disabled ? "" : "cursor-pointer"}`}
		>
			{ticks.map((t) => (
				<div key={`tick-${t}`}>
					<div
						className="absolute inset-y-0 w-px bg-border"
						style={{ left: `${positionPercent(t)}%` }}
					/>
					<div
						className="absolute bottom-0.5 hidden translate-x-1 font-mono text-[11px] leading-none text-muted-foreground sm:block"
						style={{ left: `${positionPercent(t)}%` }}
					>
						{formatSeconds(t)}
					</div>
				</div>
			))}

			{/* 下書きマーク（上段） */}
			{uniqueDraftMarks.map((t) => (
				<div
					key={`draft-${t}`}
					data-testid="explore-draft-mark"
					className="absolute top-1.5 h-2.5 w-[3px] rounded-full bg-heart"
					style={{ left: `${positionPercent(t)}%` }}
				/>
			))}
			{/* 作成済みマーク（中段） */}
			{uniqueMadeMarks.map((t) => (
				<div
					key={`made-${t}`}
					data-testid="explore-made-mark"
					className="absolute top-5 h-2.5 w-[3px] rounded-full bg-suzuka-600"
					style={{ left: `${positionPercent(t)}%` }}
				/>
			))}

			{/* トリムレーンが拡大中の範囲 */}
			<div
				data-testid="explore-window"
				className="pointer-events-none absolute inset-y-0 rounded-sm border-2 border-foreground bg-foreground/15"
				style={{
					left: `${windowLeft}%`,
					width: `${Math.max(windowRight - windowLeft, 0.4)}%`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 -translate-x-1/2 text-[10px] leading-none text-foreground"
				style={{ left: `${windowCenter}%` }}
			>
				▼
			</div>

			<div className="pointer-events-none absolute bottom-0.5 left-2 font-mono text-[11px] leading-none text-muted-foreground">
				0:00
			</div>
			<div className="pointer-events-none absolute right-2 bottom-0.5 font-mono text-[11px] leading-none text-muted-foreground">
				{formatSeconds(videoDuration)}
			</div>
		</div>
	);
}
