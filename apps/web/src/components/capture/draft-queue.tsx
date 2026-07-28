"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatSeconds } from "@/utils/format-seconds";
import type { DraftVideoGroup } from "./draft-groups";

interface DraftQueueProps {
	groups: DraftVideoGroup[];
	totalCount: number;
	/** マーキング中の動画（そのグループには復帰導線を出さない） */
	currentVideoId?: string;
	/** 配信中・配信予定でまだ仕上げられない動画ID（表示中かどうかとは無関係に効く） */
	awaitingArchiveVideoIds: string[];
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

function GroupHeader({
	group,
	currentVideoId,
	isLocked,
}: {
	group: DraftVideoGroup;
	currentVideoId?: string;
	isLocked: boolean;
}) {
	const firstDraft = group.drafts[0];
	return (
		<div className="flex items-center gap-3 p-3 bg-muted/40 border-b">
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium truncate">{group.videoTitle}</p>
				<p className="text-xs text-muted-foreground">{group.drafts.length}件の下書き</p>
			</div>
			{group.videoId !== currentVideoId && (
				// 中断→再開が常態の動画視聴マーキング向けの復帰導線。同一ツリー内なので soft nav でよい
				<Button
					size="sm"
					variant="outline"
					render={
						<Link href={`/capture?v=${group.videoId}`}>
							<Bookmark className="h-3.5 w-3.5 mr-1" />
							マークを続ける
						</Link>
					}
				/>
			)}
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
								まとめて仕上げる
							</a>
						}
					/>
				)
			)}
		</div>
	);
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
 * 動画単位の下書きキュー（SPR-266 第2段）。
 * 仕上げ可否は「マーク時に配信だったか」ではなく「今アーカイブか」で決まるため、
 * 下書き自身ではなく動画の現在状態から判定する。
 */
export function DraftQueue({
	groups,
	totalCount,
	currentVideoId,
	awaitingArchiveVideoIds,
	onDelete,
}: DraftQueueProps) {
	const awaitingArchive = new Set(awaitingArchiveVideoIds);
	return (
		<div className="space-y-3">
			<h2 className="text-lg font-semibold">
				下書き
				{totalCount > 0 && (
					<span className="ml-2 text-sm font-normal text-muted-foreground">{totalCount}件</span>
				)}
			</h2>

			{totalCount === 0 ? (
				<p className="text-sm text-muted-foreground">
					まだ下書きがありません。配信や動画を見ながらマークするとここに溜まります。
				</p>
			) : (
				<div className="space-y-4">
					{groups.map((group) => {
						const isLocked = awaitingArchive.has(group.videoId);
						return (
							<div key={group.videoId} className="border rounded-lg overflow-hidden">
								<GroupHeader group={group} currentVideoId={currentVideoId} isLocked={isLocked} />
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
