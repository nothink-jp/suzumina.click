"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { formatSeconds } from "@/utils/format-seconds";

interface DraftQueueProps {
	/** 表示中の動画の下書きのみ・新しい順（マーク直後に先頭へ積まれる＝即時の手応え） */
	drafts: AudioButtonDraft[];
	/** このセッションでマークした下書き ID（先頭行の NEW 表示に使う） */
	sessionMarkedIds: ReadonlySet<string>;
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

/**
 * 今回のマーク（集中モードの積み上がるキュー・導線再設計 段2）。
 *
 * 新しい順＝マークした瞬間に先頭へ積まれるのが即時フィードバック。
 * まとめて仕上げるは固定バー（capture-action-bar）の仕事で、ここには置かない。
 * 溜める・棚卸しは /drafts（マーク棚）が担う。
 */
export function DraftQueue({ drafts, sessionMarkedIds, isLocked, onDelete }: DraftQueueProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-baseline gap-2">
				<h2 className="text-sm font-semibold">
					今回のマーク
					{drafts.length > 0 && (
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							{drafts.length}件
						</span>
					)}
				</h2>
				<span className="text-xs text-muted-foreground">新しい順</span>
				{isLocked && drafts.length > 0 && (
					<span className="ml-auto text-xs text-muted-foreground">アーカイブ公開後に仕上げ</span>
				)}
			</div>

			{drafts.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					まだマークがありません。「ここ！」と思った瞬間に M キーを押してください。
				</p>
			) : (
				<ul className="divide-y border rounded-lg overflow-hidden">
					{drafts.map((draft, index) => (
						<li key={draft.id} className="flex items-center gap-2 p-3">
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium flex items-center gap-2">
									{formatSeconds(draft.suggestedStartTime)} から
									{index === 0 && sessionMarkedIds.has(draft.id) && (
										<Badge className="bg-heart text-heart-foreground">NEW</Badge>
									)}
									{draft.playerTime == null && (
										<span className="text-xs text-warning">壁時計のみ・要頭出し</span>
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
					))}
				</ul>
			)}
		</div>
	);
}
