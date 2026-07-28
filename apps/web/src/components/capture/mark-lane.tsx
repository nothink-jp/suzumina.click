"use client";

import { formatSeconds } from "@/utils/format-seconds";

interface MarkLaneProps {
	durationSeconds: number;
	/** この動画から作成済みの音声ボタンの開始秒（primary＝ローズの目印） */
	madeMarks: number[];
	/** 今回のマーク（自分の下書き）の推奨開始秒（heart＝差し色の目印） */
	draftMarks: number[];
	/** レーンをクリックした位置（秒）へシーク */
	onSeek: (seconds: number) => void;
}

/**
 * マーク位置レーン（集中モードの即時フィードバック・導線再設計 段2）。
 *
 * マークした瞬間に縦線が刺さる＝「何かが生まれた」手応えを返す面。
 * クリックでその位置へシークできる（アーカイブ視聴の振り返り用。目盛りの精密さは
 * 仕上げ画面の探索レーンの仕事なので、ここは概観に徹する）。
 */
export function MarkLane({ durationSeconds, madeMarks, draftMarks, onSeek }: MarkLaneProps) {
	if (durationSeconds <= 0) {
		return null;
	}

	const toPercent = (seconds: number) =>
		`${Math.min(100, Math.max(0, (seconds / durationSeconds) * 100))}%`;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>マークの位置（クリックでその位置へ）</span>
				<span>
					作成済み {madeMarks.length} ・ 今回のマーク{" "}
					<span className="text-heart font-medium">{draftMarks.length}</span>
				</span>
			</div>
			<button
				type="button"
				className="relative block w-full h-8 rounded-md bg-muted overflow-hidden cursor-pointer"
				aria-label="マーク位置レーン（クリックした位置へ移動）"
				onClick={(event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					if (rect.width <= 0) {
						return;
					}
					const ratio = (event.clientX - rect.left) / rect.width;
					onSeek(Math.min(durationSeconds, Math.max(0, ratio * durationSeconds)));
				}}
			>
				{madeMarks.map((seconds, index) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: 開始秒は重複しうる静的目印のため index 併用で足りる
						key={`made-${seconds}-${index}`}
						className="absolute top-0 bottom-0 w-0.5 bg-primary/70"
						style={{ left: toPercent(seconds) }}
						aria-hidden="true"
					/>
				))}
				{draftMarks.map((seconds, index) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: 開始秒は重複しうる静的目印のため index 併用で足りる
						key={`draft-${seconds}-${index}`}
						className="absolute top-0 bottom-0 w-0.5 bg-heart"
						style={{ left: toPercent(seconds) }}
						aria-hidden="true"
					/>
				))}
			</button>
			<div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
				<span>0:00</span>
				<span>{formatSeconds(durationSeconds)}</span>
			</div>
		</div>
	);
}
