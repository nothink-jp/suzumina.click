"use client";

import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, ExternalLink, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { deleteButtonDraft, updateButtonDraftPlayerTime } from "@/actions/button-drafts";
import { type DraftVideoGroup, groupDraftsByVideo } from "@/components/capture/draft-groups";
import { MARK_ADJUST_STEP_SECONDS } from "@/components/capture/mark-chip";
import { refreshDraftCount } from "@/hooks/use-draft-count";
import { formatSeconds } from "@/utils/format-seconds";

/** グループ表示に使う動画の現在状態（page 側で videos から算出して渡す） */
export interface DraftShelfVideoInfo {
	/** 配信中・配信予定＝まだ仕上げられない */
	isAwaitingArchive: boolean;
	/** この動画から作成済みの音声ボタン数（貢献の進み具合の提示用） */
	audioButtonCount: number;
}

interface DraftsShelfViewProps {
	initialDrafts: AudioButtonDraft[];
	/** videoId → 現在状態。videos から引けなかった動画はエントリなし（仕上げ可として扱う） */
	videoInfos: Record<string, DraftShelfVideoInfo>;
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

/** グループの「拾った日」表示（最新マークの日付で代表させる） */
function formatPickedDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function DraftShelfRow({
	draft,
	isLocked,
	isAdjusting,
	onAdjust,
	onDelete,
}: {
	draft: AudioButtonDraft;
	isLocked: boolean;
	isAdjusting: boolean;
	onAdjust: (draftId: string, deltaSeconds: number) => void;
	onDelete: (draftId: string) => void;
}) {
	// 壁時計のみモード（playerTime=null）は位置を持たないため微調整できない
	const canAdjust = draft.playerTime != null;
	const canRewind = (draft.playerTime ?? 0) >= MARK_ADJUST_STEP_SECONDS;
	return (
		<li className="flex items-center gap-2 p-3 flex-wrap">
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">
					{formatSeconds(draft.suggestedStartTime)} から
					{draft.playerTime == null && (
						<span className="ml-2 text-xs text-warning">壁時計のみ・要頭出し</span>
					)}
				</p>
				<p className="text-xs text-muted-foreground">{formatMarkedAt(draft.markedAt)} にマーク</p>
			</div>
			{canAdjust && (
				<>
					<Button
						size="sm"
						variant="outline"
						disabled={isAdjusting || !canRewind}
						aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒前にする`}
						onClick={() => onAdjust(draft.id, -MARK_ADJUST_STEP_SECONDS)}
					>
						<Minus className="h-3.5 w-3.5 mr-1" />
						{MARK_ADJUST_STEP_SECONDS}秒
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={isAdjusting}
						aria-label={`開始位置を${MARK_ADJUST_STEP_SECONDS}秒後にする`}
						onClick={() => onAdjust(draft.id, MARK_ADJUST_STEP_SECONDS)}
					>
						<Plus className="h-3.5 w-3.5 mr-1" />
						{MARK_ADJUST_STEP_SECONDS}秒
					</Button>
				</>
			)}
			{!isLocked && (
				<Button
					size="sm"
					variant="outline"
					render={
						// /buttons ツリーへの遷移はフルロード（intercepting route 回避・SPR-252）
						<a
							href={`/buttons/create?video_id=${draft.videoId}&start_time=${draft.suggestedStartTime}&draft_id=${draft.id}`}
						>
							<ExternalLink className="h-3.5 w-3.5 mr-1" />
							この1件を仕上げる
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

function DraftShelfGroup({
	group,
	info,
	isAdjusting,
	onAdjust,
	onDelete,
}: {
	group: DraftVideoGroup;
	info: DraftShelfVideoInfo | undefined;
	isAdjusting: boolean;
	onAdjust: (draftId: string, deltaSeconds: number) => void;
	onDelete: (draftId: string) => void;
}) {
	const isLocked = info?.isAwaitingArchive === true;
	const firstDraft = group.drafts[0];
	return (
		<section className="border rounded-lg overflow-hidden" aria-label={group.videoTitle}>
			<div className="flex items-center gap-3 p-3 bg-muted/40 border-b flex-wrap">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium truncate">{group.videoTitle}</p>
					<p className="text-xs text-muted-foreground">
						{group.drafts.length}件・{formatPickedDate(group.latestCreatedAt)} に拾った
						{info != null && !isLocked && ` ・ 作成済み ${info.audioButtonCount}本`}
					</p>
				</div>
				{isLocked ? (
					<>
						<Badge variant="destructive">配信中</Badge>
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							アーカイブ公開後に仕上げられます
						</span>
						<Button
							size="sm"
							variant="outline"
							render={
								<Link href={`/watch?v=${group.videoId}`}>
									<Bookmark className="h-3.5 w-3.5 mr-1" />
									配信に戻る
								</Link>
							}
						/>
					</>
				) : (
					<>
						<Button
							size="sm"
							variant="outline"
							render={
								<Link href={`/watch?v=${group.videoId}`}>
									<Bookmark className="h-3.5 w-3.5 mr-1" />
									見ながら足す
								</Link>
							}
						/>
						{firstDraft && (
							<Button
								size="sm"
								render={
									// 先頭（推奨開始秒が最小）から開けば同一動画のキューは create 側が読み込み、
									// 連続仕上げ（SPR-266 第2段）につながる。フルロード遷移（SPR-252）
									<a
										href={`/buttons/create?video_id=${group.videoId}&start_time=${firstDraft.suggestedStartTime}&draft_id=${firstDraft.id}`}
									>
										<ExternalLink className="h-3.5 w-3.5 mr-1" />
										まとめて仕上げる（{group.drafts.length}）
									</a>
								}
							/>
						)}
					</>
				)}
			</div>
			<ul className="divide-y">
				{group.drafts.map((draft) => (
					<DraftShelfRow
						key={draft.id}
						draft={draft}
						isLocked={isLocked}
						isAdjusting={isAdjusting}
						onAdjust={onAdjust}
						onDelete={onDelete}
					/>
				))}
			</ul>
		</section>
	);
}

/**
 * マーク棚（/drafts・導線再設計 段2）。
 *
 * 「溜める・棚卸しする」を視聴（/watch）から分離した画面。単位は配信の束で、
 * 主アクションは束の「まとめて仕上げる」。仕上げ可否はグループ自身の動画の
 * **現在**状態（page 側で videos から算出）で判定する — マーク時の状態は使わない。
 * 束は古い順（先に拾ったものから片付けるのが棚卸しの自然な順序）。
 */
export function DraftsShelfView({ initialDrafts, videoInfos }: DraftsShelfViewProps) {
	const [drafts, setDrafts] = useState<AudioButtonDraft[]>(initialDrafts);
	const [isAdjusting, setIsAdjusting] = useState(false);
	const [error, setError] = useState("");

	const groups = useMemo(() => {
		const newestFirst = groupDraftsByVideo(drafts);
		// groupDraftsByVideo は /watch 向けに新しい順。棚は古い順に反転する
		return [...newestFirst].reverse();
	}, [drafts]);

	const handleAdjust = useCallback(
		async (draftId: string, deltaSeconds: number) => {
			if (isAdjusting) {
				return;
			}
			const target = drafts.find((d) => d.id === draftId);
			if (!target || target.playerTime == null) {
				return;
			}
			setIsAdjusting(true);
			setError("");
			const result = await updateButtonDraftPlayerTime(
				draftId,
				Math.max(0, target.playerTime + deltaSeconds),
			);
			if (result.success) {
				setDrafts((prev) => prev.map((d) => (d.id === result.data.id ? result.data : d)));
			} else {
				setError(result.error);
			}
			setIsAdjusting(false);
		},
		[drafts, isAdjusting],
	);

	const handleDelete = useCallback(async (draftId: string) => {
		const result = await deleteButtonDraft(draftId);
		if (result.success) {
			setDrafts((prev) => prev.filter((d) => d.id !== draftId));
			// ナビ「マーク N」バッジはレイアウト常駐で再マウントされない＝能動的に取り直す
			refreshDraftCount();
		} else {
			setError(result.error ?? "下書きの削除に失敗しました");
		}
	}, []);

	const videoCount = groups.length;

	return (
		<div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold mb-1">マーク（下書き）</h1>
				<p className="text-sm text-muted-foreground">
					{drafts.length > 0
						? `${videoCount}配信・${drafts.length}件　拾ったまま仕上げていないもの`
						: "拾ったまま仕上げていないマークが、配信ごとにここへ並びます。"}
				</p>
			</div>

			{error && (
				<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{drafts.length === 0 ? (
				<div className="border rounded-lg p-6 text-center space-y-3">
					<p className="text-muted-foreground">
						まだ下書きがありません。配信や動画を見ながらマークするとここに溜まります。
					</p>
					<Button
						variant="outline"
						render={
							<Link href="/videos">
								<Bookmark className="h-4 w-4 mr-2" />
								動画を選んでマークする
							</Link>
						}
					/>
				</div>
			) : (
				<div className="space-y-4">
					{groups.map((group) => (
						<DraftShelfGroup
							key={group.videoId}
							group={group}
							info={videoInfos[group.videoId]}
							isAdjusting={isAdjusting}
							onAdjust={(draftId, delta) => void handleAdjust(draftId, delta)}
							onDelete={(draftId) => void handleDelete(draftId)}
						/>
					))}
				</div>
			)}

			<p className="text-xs text-muted-foreground">
				下書きは500件まで保持されます。
				<Link href="/videos" className="ml-2 underline underline-offset-4 hover:text-foreground">
					拾える配信を探す →
				</Link>
			</p>
		</div>
	);
}
