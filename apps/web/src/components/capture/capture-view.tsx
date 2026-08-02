"use client";

import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useCaptureDrafts } from "@/hooks/use-capture-drafts";
import { CREATE_ENTRY, CREATE_ENTRY_PARAM } from "@/lib/analytics/create-entry";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { CaptureActionBar } from "./capture-action-bar";
import { CaptureHeader } from "./capture-header";
import { CaptureTarget } from "./capture-target";
import { DraftQueue } from "./draft-queue";
import { MarkChip } from "./mark-chip";
import { MarkLane } from "./mark-lane";
import { resolveCaptureVideoMode } from "./video-mode";
import { VideoPicker } from "./video-picker";

interface CaptureViewProps {
	video: VideoPlainObject | null;
	/** ?v= で指定されたが videos に無かった動画ID（選択状態で理由を出すためだけに使う） */
	notFoundVideoId?: string;
	/** 表示中の動画の下書きのみ（「今回のマーク」。他の配信の下書きは棚 /drafts の仕事） */
	initialDrafts: AudioButtonDraft[];
	/** 他の配信に残っている下書きの件数案内（null なら案内を出さない） */
	otherDraftsSummary: { videos: number; drafts: number } | null;
	/** この動画から作成済みの音声ボタンの開始秒（マーク位置レーンの目印） */
	madeMarks: number[];
	/** 動画の長さ（秒）。取得できない場合は 0 = レーン非表示 */
	videoDurationSeconds: number;
}

/** まとめて仕上げるの行き先（先頭 = 推奨開始秒が最小の下書き。連続仕上げ SPR-266 の入口） */
function buildBulkHref(drafts: AudioButtonDraft[]): string | null {
	if (drafts.length === 0) {
		return null;
	}
	const first = drafts.reduce((min, draft) =>
		draft.suggestedStartTime < min.suggestedStartTime ? draft : min,
	);
	return `/buttons/create?video_id=${first.videoId}&start_time=${first.suggestedStartTime}&draft_id=${first.id}&${CREATE_ENTRY_PARAM}=${CREATE_ENTRY.watchBulk}`;
}

/**
 * マーキング画面（SPR-146。配信・アーカイブ動画の両対象・集中モード）。
 *
 * SPR-145 の計測ハーネスの製品版: マーク時に playerTime（主信号）と壁時計（フォールバック）を
 * 下書きとして保存する。プレイヤーが使えない場合も壁時計のみで保存を継続する（劣化モード）。
 *
 * 構成は〈細いヘッダー〉〈プレイヤー＋マーク位置レーン〉〈今回のマーク〉〈固定マークバー〉の4面
 * （導線再設計 段2）。報酬の遅延は3段で埋める:
 * 即時=レーンとキュー先頭 / 4秒だけ=マーク直後チップ / 視聴後=固定バーのまとめて仕上げる。
 *
 * 配信/アーカイブのモードは下書きに保存せず、表示のたびに動画から導出する。
 * 「仕上げてよいか」の実体は *マーク時に配信だったか* ではなく *今アーカイブになっているか* のため。
 */
export function CaptureView({
	video,
	notFoundVideoId,
	initialDrafts,
	otherDraftsSummary,
	madeMarks,
	videoDurationSeconds,
}: CaptureViewProps) {
	const playerRef = useRef<YTPlayer | null>(null);

	// モード導出の正本は resolveCaptureVideoMode（/drafts 側の仕上げ可否判定と同じ関数を使う）
	const mode = video ? resolveCaptureVideoMode(video) : null;
	const isLiveNow = mode === "live";
	const isUpcoming = mode === "upcoming";
	// 埋め込み不可の動画はプレイヤーが動かず playerTime が取れない＝壁時計のみの使えない下書きしか
	// 残らないため、マーク自体を止める（任意の動画を選べるようになって初めて起こるケース）
	const isEmbeddable = video?.status?.embeddable !== false;
	const isLocked = isLiveNow || isUpcoming;

	const {
		drafts,
		lastMarkedDraft,
		sessionMarkedIds,
		isMarking,
		isAdjusting,
		justMarked,
		error,
		notice,
		mark,
		adjust,
		remove,
	} = useCaptureDrafts({ video, isEmbeddable, initialDrafts, playerRef });

	// M キーでマーク。ガードの正本は matchShortcutKey（create/edit の I/O キーと共通・SPR-266）
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (matchShortcutKey(event, ["m"]) === null) {
				return;
			}
			event.preventDefault();
			void mark();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [mark]);

	const handleSeek = useCallback((seconds: number) => {
		playerRef.current?.seekTo?.(seconds, true);
	}, []);

	// 動画未選択 = 選択状態。「選ぶ」は /videos（拾える配信タブ）の仕事なので行き先を指すだけ（段3）
	if (!video) {
		return (
			<div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
				<div>
					<h1 className="text-2xl font-bold mb-1">マーキング</h1>
					<p className="text-sm text-muted-foreground">
						見ながら「ここ！」をマーク（M
						キー）。下書きはあとからまとめて音声ボタンに仕上げられます。
					</p>
				</div>
				<VideoPicker notFoundVideoId={notFoundVideoId} />
				{otherDraftsSummary && <OtherDraftsNote summary={otherDraftsSummary} />}
			</div>
		);
	}

	return (
		<>
			<div className="container mx-auto px-4 py-4 max-w-6xl space-y-4 pb-32">
				<CaptureHeader
					video={video}
					isLiveNow={isLiveNow}
					isUpcoming={isUpcoming}
					durationSeconds={videoDurationSeconds}
					markCount={drafts.length}
				/>

				{error && (
					<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}

				{notice && (
					<div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
						{/* warning-foreground は bg-warning 上の白文字用。薄い背景では text-warning を使う */}
						<p className="text-sm text-warning">{notice}</p>
					</div>
				)}

				{/* デスクトップは〈プレイヤー＋レーン | キュー〉の2カラム。モバイルは縦積み */}
				<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<div className="space-y-3">
						<CaptureTarget
							video={video}
							isUpcoming={isUpcoming}
							isEmbeddable={isEmbeddable}
							onPlayerReady={(player) => {
								playerRef.current = player;
							}}
						/>
						{isEmbeddable && (
							<MarkLane
								durationSeconds={videoDurationSeconds}
								madeMarks={madeMarks}
								draftMarks={drafts.map((draft) => draft.suggestedStartTime)}
								onSeek={handleSeek}
							/>
						)}
					</div>
					<div className="space-y-4">
						<DraftQueue
							drafts={drafts}
							sessionMarkedIds={sessionMarkedIds}
							isLocked={isLocked}
							onDelete={(draftId) => void remove(draftId)}
						/>
						{otherDraftsSummary && <OtherDraftsNote summary={otherDraftsSummary} />}
					</div>
				</div>
			</div>

			{/* マーク直後の4秒チップ（プレイヤーを覆わず・再生を止めず・自動で消える） */}
			{lastMarkedDraft && (
				<MarkChip
					draft={lastMarkedDraft}
					showFinishNow={!isLocked}
					isAdjusting={isAdjusting}
					onAdjust={(delta) => void adjust(delta)}
				/>
			)}

			{isEmbeddable && (
				<CaptureActionBar
					isMarking={isMarking}
					justMarked={justMarked}
					onMark={() => void mark()}
					bulkHref={isLocked ? null : buildBulkHref(drafts)}
					bulkCount={drafts.length}
				/>
			)}
		</>
	);
}

function OtherDraftsNote({ summary }: { summary: { videos: number; drafts: number } }) {
	return (
		<p className="text-sm text-muted-foreground">
			他の配信の下書き（{summary.videos}配信・{summary.drafts}件）は
			<Link href="/drafts" className="mx-1 underline underline-offset-4 hover:text-foreground">
				マーク棚
			</Link>
			から仕上げられます。
		</p>
	);
}
