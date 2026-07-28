"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { formatSeconds } from "@/utils/format-seconds";

/** 微調整の1回あたりの秒数 */
export const MARK_ADJUST_STEP_SECONDS = 5;

interface MarkAdjusterProps {
	draft: AudioButtonDraft;
	isAdjusting: boolean;
	onAdjust: (deltaSeconds: number) => void;
}

/**
 * 直前のマークの位置をその場でずらす（SPR-146 第3段）。
 *
 * 配信中は未来へ飛べないため成立しなかった操作で、アーカイブ動画を見ながらのマーキングで
 * 初めて意味を持つ。ずらすのは生信号 playerTime で、表示は利用者が気にする開始位置
 * （= playerTime − プリロール）で見せる。プリロール定数をモード別に分岐させる代わりに、
 * ここで人が直せるようにする方針（SPR-145 の実測を持たない値を増やさない）。
 */
export function MarkAdjuster({ draft, isAdjusting, onAdjust }: MarkAdjusterProps) {
	// 0 秒より手前へは下げられない（playerTime の下限）
	const canRewind = (draft.playerTime ?? 0) >= MARK_ADJUST_STEP_SECONDS;

	return (
		<div className="flex items-center gap-2 flex-wrap text-sm">
			<span className="text-muted-foreground">直前のマーク</span>
			<span className="font-medium tabular-nums">
				{formatSeconds(draft.suggestedStartTime)} から
			</span>
			<Button
				size="sm"
				variant="outline"
				disabled={isAdjusting || !canRewind}
				aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒前にする`}
				onClick={() => onAdjust(-MARK_ADJUST_STEP_SECONDS)}
			>
				<Minus className="h-3.5 w-3.5 mr-1" />
				{MARK_ADJUST_STEP_SECONDS}秒
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={isAdjusting}
				aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒後にする`}
				onClick={() => onAdjust(MARK_ADJUST_STEP_SECONDS)}
			>
				<Plus className="h-3.5 w-3.5 mr-1" />
				{MARK_ADJUST_STEP_SECONDS}秒
			</Button>
		</div>
	);
}
