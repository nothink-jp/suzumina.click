"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatSeconds } from "@/utils/format-seconds";

/** 微調整の1回あたりの秒数（/drafts の行調整と共通） */
export const MARK_ADJUST_STEP_SECONDS = 5;

/** チップの自動消灯までの時間。プレイヤーを覆わず・再生を止めず・自動で消えるための短さ */
const CHIP_VISIBLE_MS = 4000;

interface MarkChipProps {
	/** 直前にマークした下書き（調整で更新された最新値） */
	draft: AudioButtonDraft;
	/** アーカイブのみ「すぐ仕上げる」を出す（配信中は二度手間の感覚が起きる状況自体を作らない） */
	showFinishNow: boolean;
	isAdjusting: boolean;
	onAdjust: (deltaSeconds: number) => void;
}

/**
 * マーク直後だけ出る一時チップ（導線再設計 段2/集中モード）。
 *
 * 報酬の遅延を埋める中間段: 即時（キュー先頭に積まれる）と視聴後（まとめて仕上げる）の間で、
 * 4秒だけ「いま拾った位置」の微調整と即仕上げの入口を出す。
 * Tab では拾わない（M 連打の邪魔をしない・同じ機能は /drafts に常設されている）。
 */
export function MarkChip({ draft, showFinishNow, isAdjusting, onAdjust }: MarkChipProps) {
	const [visible, setVisible] = useState(true);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// 表示タイマー。新しいマーク（draft.id 変化）と微調整（playerTime 変化）で延長する
	// biome-ignore lint/correctness/useExhaustiveDependencies: id/playerTime の変化でタイマーを張り直すのが意図
	useEffect(() => {
		setVisible(true);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => setVisible(false), CHIP_VISIBLE_MS);
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [draft.id, draft.playerTime]);

	if (!visible) {
		return null;
	}

	const canRewind = (draft.playerTime ?? 0) >= MARK_ADJUST_STEP_SECONDS;

	return (
		<output
			className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border bg-background/95 backdrop-blur px-4 py-2 shadow-lg"
			aria-live="polite"
		>
			<span className="text-sm font-medium tabular-nums whitespace-nowrap">
				{draft.playerTime == null
					? "マークしました（壁時計のみ・要頭出し）"
					: `${formatSeconds(draft.playerTime)} をマーク`}
			</span>
			{draft.playerTime != null && (
				<>
					<Button
						size="sm"
						variant="outline"
						tabIndex={-1}
						disabled={isAdjusting || !canRewind}
						aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒前にする`}
						onClick={() => onAdjust(-MARK_ADJUST_STEP_SECONDS)}
					>
						<Minus className="h-3.5 w-3.5" />
						{MARK_ADJUST_STEP_SECONDS}
					</Button>
					<Button
						size="sm"
						variant="outline"
						tabIndex={-1}
						disabled={isAdjusting}
						aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒後にする`}
						onClick={() => onAdjust(MARK_ADJUST_STEP_SECONDS)}
					>
						<Plus className="h-3.5 w-3.5" />
						{MARK_ADJUST_STEP_SECONDS}
					</Button>
				</>
			)}
			{showFinishNow && (
				<Button
					size="sm"
					tabIndex={-1}
					render={
						// フルロード遷移（intercepting route 回避・SPR-252）
						<a
							href={`/buttons/create?video_id=${draft.videoId}&start_time=${draft.suggestedStartTime}&draft_id=${draft.id}`}
						>
							<ExternalLink className="h-3.5 w-3.5 mr-1" />
							すぐ仕上げる
						</a>
					}
				/>
			)}
		</output>
	);
}
