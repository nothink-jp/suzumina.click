"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { formatSeconds } from "@/utils/format-seconds";
import type { DraftVideoGroup } from "./draft-groups";

interface DraftQueueProps {
	/** 表示中の動画のグループのみ（0 or 1 グループ。「今回のマーク」・導線再設計 段2） */
	groups: DraftVideoGroup[];
	totalCount: number;
	/** 表示中の動画が配信中/配信予定＝まだ仕上げられない */
	isLocked: boolean;
	onDelete: (draftId: string) => void;
}

function formatMarkedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toLocaleString("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function DraftRow({
	draft,
	isLocked,
	onDelete,
}: {
	draft: AudioButtonDraft;
	isLocked: boolean;
	onDelete: (draftId: string) => void;
}) {
	return (
		<li className="flex items-center gap-3 p-3">
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">
					{formatSeconds(draft.suggestedStartTime)} から
					{draft.playerTime == null && (
						<span className="ml-2 text-xs text-warning">壁時計のみ・要頭出し</span>
					)}
				</p>
				<p className="text-xs text-muted-foreground">{formatMarkedAt(draft.markedAt)}</p>
			</div>
			{!isLocked && (
				<Button
					size="sm"
					variant="outline"
					render={
						// この1件だけを仕上げたいときの個別導線（フルロード・SPR-252）
						<a
							href={`/buttons/create?video_id=${draft.videoId}&start_time=${draft.suggestedStartTime}&draft_id=${draft.id}`}
						>
							<ExternalLink className="h-3.5 w-3.5 mr-1" />
							仕上げる
						</a>
					}
				/>
			)}
			<Button
				size="sm"
				variant="ghost"
				aria-label="下書きを削除"
				onClick={() => onDelete(draft.id)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</li>
	);
}

/**
 * 今回のマーク（表示中の動画の下書きキュー）。
 * 溜める・棚卸しは /drafts（マーク棚）の仕事で、ここは視聴中のマークの確認と
 * 視聴後の「まとめて仕上げる」だけを担う。
 */
export function DraftQueue({ groups, totalCount, isLocked, onDelete }: DraftQueueProps) {
	return (
		<div className="space-y-3">
			<h2 className="text-lg font-semibold">
				今回のマーク
				{totalCount > 0 && (
					<span className="ml-2 text-sm font-normal text-muted-foreground">{totalCount}件</span>
				)}
			</h2>

			{totalCount === 0 ? (
				<p className="text-sm text-muted-foreground">
					まだマークがありません。「ここ！」と思った瞬間に M キーを押してください。
				</p>
			) : (
				<div className="space-y-4">
					{groups.map((group) => {
						const firstDraft = group.drafts[0];
						return (
							<div key={group.videoId} className="border rounded-lg overflow-hidden">
								<div className="flex items-center gap-3 p-3 bg-muted/40 border-b">
									<p className="text-xs text-muted-foreground min-w-0 flex-1">
										{group.drafts.length}件の下書き
									</p>
									{isLocked ? (
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											アーカイブ公開後に仕上げ
										</span>
									) : (
										firstDraft && (
											<Button
												size="sm"
												render={
													// /buttons ツリーへの遷移はフルロード（intercepting route 回避・SPR-252）。
													// 先頭の下書きから開けば同一動画のキューは create 側が読み込み、
													// 連続仕上げ（SPR-266 第2段）につながる
													<a
														href={`/buttons/create?video_id=${group.videoId}&start_time=${firstDraft.suggestedStartTime}&draft_id=${firstDraft.id}`}
													>
														<ExternalLink className="h-3.5 w-3.5 mr-1" />
														まとめて仕上げる（{group.drafts.length}）
													</a>
												}
											/>
										)
									)}
								</div>
								<ul className="divide-y">
									{group.drafts.map((draft) => (
										<DraftRow
											key={draft.id}
											draft={draft}
											isLocked={isLocked}
											onDelete={onDelete}
										/>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
