"use client";

import { formatTimestamp } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ChevronRight, Loader2, Plus } from "lucide-react";

const roundTenth = (value: number) => Math.round(value * 10) / 10;

interface CreationActionBarProps {
	startTime: number;
	endTime: number;
	/** 作成できない理由（null なら作成可能）。disabled ボタンは tooltip が出ないため文言で併記する */
	disabledReason: string | null;
	isCreating: boolean;
	/**
	 * 副アクション（残留して続ける）のラベル。ボタンは増やさず文字だけモードで変える（段4）:
	 * 下書きキュー進行中は「作成して次の下書きへ（残り N）」、通常は「作成して次を切り抜く」
	 */
	continueLabel: string;
	onCancel: () => void;
	onCreate: () => void;
	onCreateAndContinue: () => void;
}

/**
 * 作成画面の固定アクションバー（SPR-290）。
 * 選択範囲と作成ボタンを常時視界に置き、押せないときは理由を隣に出す
 * （共有 Button の disabled は pointer-events-none で title tooltip が効かない）。
 */
export function CreationActionBar({
	startTime,
	endTime,
	disabledReason,
	isCreating,
	continueLabel,
	onCancel,
	onCreate,
	onCreateAndContinue,
}: CreationActionBarProps) {
	const duration = roundTenth(endTime - startTime);
	const canCreate = disabledReason === null;

	return (
		// mt-auto: 親（flex-col）の末尾で、短いページでも下端に付ける
		<div className="sticky bottom-0 z-10 mt-auto border-t bg-card shadow-lg">
			<div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
				<div className="flex items-baseline gap-2">
					<span className="font-mono text-sm font-semibold text-primary sm:text-base">
						{formatTimestamp(startTime)}
					</span>
					<ChevronRight className="h-3.5 w-3.5 self-center text-muted-foreground" />
					<span className="font-mono text-sm font-semibold text-primary sm:text-base">
						{formatTimestamp(endTime)}
					</span>
					<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary whitespace-nowrap">
						{duration > 0 ? `${duration.toFixed(1)}秒` : "—"}
					</span>
				</div>

				{!canCreate && <span className="text-sm text-destructive">{disabledReason}</span>}

				<div className="ml-auto flex items-center gap-2 sm:gap-3">
					<Button variant="ghost" onClick={onCancel} disabled={isCreating} className="min-h-[44px]">
						キャンセル
					</Button>
					{/* 連続作成はデスクトップの語彙（モバイルは1件を仕上げるだけに絞る） */}
					<Button
						variant="outline"
						onClick={onCreateAndContinue}
						disabled={!canCreate || isCreating}
						className="hidden min-h-[44px] whitespace-nowrap sm:inline-flex"
					>
						{continueLabel}
					</Button>
					<Button
						onClick={onCreate}
						disabled={!canCreate || isCreating}
						size="lg"
						className="min-h-[44px] px-5 sm:px-8"
					>
						{isCreating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								作成中...
							</>
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								音声ボタンを作成
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
