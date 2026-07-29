"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { SkipForward } from "lucide-react";
import { formatSeconds } from "@/utils/format-seconds";

interface FinishQueueBandProps {
	/** マーク棚から渡された同一動画のキュー全体（suggestedStartTime 昇順・不変） */
	queue: AudioButtonDraft[];
	/** いま仕上げている下書き（キュー進行の正本） */
	activeDraftId: string;
	/** 未処理の下書き（現在のものは含まない） */
	remainingDrafts: AudioButtonDraft[];
	/** この配信の作成済みボタン数（進み具合の提示） */
	madeCount: number;
	isCreating: boolean;
	onSkip: () => void;
}

/**
 * 連続モードのキュー帯（導線再設計 段4・0の帯）。
 * マーク棚から来た下書きを時刻チップで並べ、いま何件目かを示す。
 * チップはデスクトップのみ（モバイルは「K件目 / N」のテキストだけ＝連続作成はデスクトップの語彙）。
 */
export function FinishQueueBand({
	queue,
	activeDraftId,
	remainingDrafts,
	madeCount,
	isCreating,
	onSkip,
}: FinishQueueBandProps) {
	const position = queue.findIndex((draft) => draft.id === activeDraftId) + 1;
	const remainingIds = new Set(remainingDrafts.map((draft) => draft.id));

	return (
		<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3 text-sm shadow-sm">
			<span className="font-medium whitespace-nowrap">マーク棚から {queue.length}件</span>
			{/* 時刻チップ: 現在=primary / 未処理=枠 / 消化・スキップ済み=打ち消し */}
			<div className="hidden sm:flex items-center gap-1.5 flex-wrap">
				{queue.map((draft) => {
					const isActive = draft.id === activeDraftId;
					const isPending = remainingIds.has(draft.id);
					return (
						<span
							key={draft.id}
							className={
								isActive
									? "rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold tabular-nums"
									: isPending
										? "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums"
										: "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground/50 line-through tabular-nums"
							}
						>
							{formatSeconds(draft.suggestedStartTime)}
						</span>
					);
				})}
			</div>
			<span className="text-muted-foreground whitespace-nowrap">
				{position > 0 ? `${position}件目 / ${queue.length}` : `${queue.length}件`}
				・この配信の作成済み {madeCount}本
			</span>
			<div className="ml-auto">
				{remainingDrafts.length > 0 ? (
					<Button
						size="sm"
						variant="ghost"
						onClick={onSkip}
						disabled={isCreating}
						className="whitespace-nowrap"
					>
						<SkipForward className="h-3.5 w-3.5 mr-1" />
						スキップして次へ
					</Button>
				) : (
					<span className="text-xs text-muted-foreground">最後の下書きです</span>
				)}
			</div>
		</div>
	);
}
