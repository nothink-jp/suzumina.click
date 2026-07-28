"use client";

import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useCaptureDrafts } from "@/hooks/use-capture-drafts";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { CaptureTarget } from "./capture-target";
import { DraftQueue } from "./draft-queue";
import { MarkAdjuster } from "./mark-adjuster";
import { resolveCaptureVideoMode } from "./video-mode";
import { VideoPicker } from "./video-picker";

interface CaptureViewProps {
	video: VideoPlainObject | null;
	/** ?v= で指定されたが videos に無かった動画ID（選択状態で理由を出すためだけに使う） */
	notFoundVideoId?: string;
	initialDrafts: AudioButtonDraft[];
	/**
	 * 下書きを持つ動画のうち、配信中・配信予定でまだ仕上げられないもの（page 側で現在状態から算出）。
	 * 省略可にすると渡し忘れが「全部仕上げ可能」に化けるため必須にしている。
	 */
	awaitingArchiveVideoIds: string[];
}

const VIDEO_ID_PATTERN = /(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/;

function parseVideoIdInput(value: string): string | null {
	const trimmed = value.trim();
	const match = trimmed.match(VIDEO_ID_PATTERN);
	if (match?.[1]) {
		return match[1];
	}
	return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

/**
 * マーキング画面（SPR-146 第1段。配信・アーカイブ動画の両方が対象）。
 *
 * SPR-145 の計測ハーネスの製品版: マーク時に playerTime（主信号）と壁時計（フォールバック）を
 * 下書きとして保存する。プレイヤーが使えない場合も壁時計のみで保存を継続する（劣化モード）。
 *
 * 配信/アーカイブのモードは下書きに保存せず、表示のたびに動画から導出する。
 * 「仕上げてよいか」の実体は *マーク時に配信だったか* ではなく *今アーカイブになっているか* であり、
 * マーク時の状態を凍結すると配信終了後の遷移を表現できなくなるため。
 */
export function CaptureView({
	video,
	notFoundVideoId,
	initialDrafts,
	awaitingArchiveVideoIds,
}: CaptureViewProps) {
	const router = useRouter();
	const playerRef = useRef<YTPlayer | null>(null);

	// モード導出の正本は resolveCaptureVideoMode（page 側の仕上げ可否判定と同じ関数を使う）
	const mode = video ? resolveCaptureVideoMode(video) : null;
	const isLiveNow = mode === "live";
	const isUpcoming = mode === "upcoming";
	// 埋め込み不可の動画はプレイヤーが動かず playerTime が取れない＝壁時計のみの使えない下書きしか
	// 残らないため、マーク自体を止める（配信限定だった頃は起こらなかったが、任意の動画を選べる今は起こる）
	const isEmbeddable = video?.status?.embeddable !== false;

	const {
		drafts,
		draftGroups,
		lastDraft,
		isMarking,
		isAdjusting,
		justMarked,
		error,
		notice,
		setError,
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

	const handleManualSubmit = useCallback(
		(rawInput: string) => {
			const videoId = parseVideoIdInput(rawInput);
			if (!videoId) {
				setError("動画の URL または ID（11文字）を入力してください");
				return;
			}
			setError("");
			router.push(`/capture?v=${videoId}`);
		},
		[router, setError],
	);

	return (
		<div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold mb-1">マーキング</h1>
				<p className="text-sm text-muted-foreground">
					{isLiveNow || isUpcoming
						? "「ここ！」と思った瞬間にマーク（M キー）。アーカイブ公開後、下書きから音声ボタンに仕上げられます。"
						: "見ながら「ここ！」をマーク（M キー）。下書きはあとからまとめて音声ボタンに仕上げられます。"}
				</p>
			</div>

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

			{video ? (
				<div className="space-y-3">
					<CaptureTarget
						video={video}
						isLiveNow={isLiveNow}
						isUpcoming={isUpcoming}
						isEmbeddable={isEmbeddable}
						isMarking={isMarking}
						justMarked={justMarked}
						onMark={() => void mark()}
						onPlayerReady={(player) => {
							playerRef.current = player;
						}}
					/>
					{isEmbeddable && lastDraft && (
						<MarkAdjuster
							draft={lastDraft}
							isAdjusting={isAdjusting}
							onAdjust={(delta) => void adjust(delta)}
						/>
					)}
				</div>
			) : (
				<VideoPicker notFoundVideoId={notFoundVideoId} onSubmit={handleManualSubmit} />
			)}

			<DraftQueue
				groups={draftGroups}
				totalCount={drafts.length}
				currentVideoId={video?.videoId}
				awaitingArchiveVideoIds={awaitingArchiveVideoIds}
				onDelete={(draftId) => void remove(draftId)}
			/>
		</div>
	);
}
