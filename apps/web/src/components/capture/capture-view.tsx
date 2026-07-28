"use client";

import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createButtonDraft, deleteButtonDraft } from "@/actions/button-drafts";
import { trackMarkDraft } from "@/lib/analytics/events";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { CaptureTarget } from "./capture-target";
import { groupDraftsByVideo } from "./draft-groups";
import { DraftQueue } from "./draft-queue";
import { VideoPicker } from "./video-picker";

interface CaptureViewProps {
	video: VideoPlainObject | null;
	/** ?v= で指定されたが videos に無かった動画ID（選択状態で理由を出すためだけに使う） */
	notFoundVideoId?: string;
	initialDrafts: AudioButtonDraft[];
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
export function CaptureView({ video, notFoundVideoId, initialDrafts }: CaptureViewProps) {
	const router = useRouter();
	const [drafts, setDrafts] = useState<AudioButtonDraft[]>(initialDrafts);
	// 動画単位のキュー表示（SPR-266 第2段）。直近の配信グループが先頭
	const draftGroups = useMemo(() => groupDraftsByVideo(drafts), [drafts]);
	const [isMarking, setIsMarking] = useState(false);
	const [error, setError] = useState("");
	const [justMarked, setJustMarked] = useState(false);
	const playerRef = useRef<YTPlayer | null>(null);

	// 判定の正本は _computed.videoType（video-card-actions / video-badge と同一。raw は stale がありうる）
	const videoType = video?._computed.videoType;
	const isLiveNow = videoType === "live" || videoType === "possibly_live";
	const isUpcoming = videoType === "upcoming";
	// 埋め込み不可の動画はプレイヤーが動かず playerTime が取れない＝壁時計のみの使えない下書きしか
	// 残らないため、マーク自体を止める（配信限定だった頃は起こらなかったが、任意の動画を選べる今は起こる）
	const isEmbeddable = video?.status?.embeddable !== false;

	const handleMark = useCallback(async () => {
		// isMarking ガードは M キーの素早い2連打による二重作成防止（ボタンの disabled では keydown を防げない）
		// isEmbeddable も同様にキー経路を塞ぐ（ボタン自体は描画されない）
		if (!video || isMarking || !isEmbeddable) {
			return;
		}
		setIsMarking(true);
		setError("");

		// 主信号 = プレイヤー再生位置。取得失敗時は null（壁時計のみモード）で保存を続行する
		let playerTime: number | null = null;
		try {
			const t = playerRef.current?.getCurrentTime?.();
			if (typeof t === "number" && Number.isFinite(t) && t >= 0) {
				playerTime = Math.round(t * 1000) / 1000;
			}
		} catch {
			// noop: 劣化モードへ
		}

		try {
			const result = await createButtonDraft({
				videoId: video.videoId,
				videoTitle: video.title,
				playerTime,
				markedAtMs: Date.now(),
			});

			if (result.success) {
				setDrafts((prev) => [result.data, ...prev]);
				trackMarkDraft(video.videoId, playerTime != null);
				setJustMarked(true);
				setTimeout(() => setJustMarked(false), 600);
			} else {
				setError(result.error);
			}
		} catch {
			setError("下書きの保存に失敗しました");
		} finally {
			setIsMarking(false);
		}
	}, [video, isMarking, isEmbeddable]);

	// M キーでマーク。ガードの正本は matchShortcutKey（create/edit の I/O キーと共通・SPR-266）
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (matchShortcutKey(event, ["m"]) === null) {
				return;
			}
			event.preventDefault();
			void handleMark();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [handleMark]);

	const handleDelete = useCallback(async (draftId: string) => {
		const result = await deleteButtonDraft(draftId);
		if (result.success) {
			setDrafts((prev) => prev.filter((d) => d.id !== draftId));
		} else {
			setError(result.error ?? "下書きの削除に失敗しました");
		}
	}, []);

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
		[router],
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

			{video ? (
				<CaptureTarget
					video={video}
					isLiveNow={isLiveNow}
					isUpcoming={isUpcoming}
					isEmbeddable={isEmbeddable}
					isMarking={isMarking}
					justMarked={justMarked}
					onMark={() => void handleMark()}
					onPlayerReady={(player) => {
						playerRef.current = player;
					}}
				/>
			) : (
				<VideoPicker notFoundVideoId={notFoundVideoId} onSubmit={handleManualSubmit} />
			)}

			<DraftQueue
				groups={draftGroups}
				totalCount={drafts.length}
				currentVideoId={video?.videoId}
				isCurrentVideoLive={isLiveNow || isUpcoming}
				onDelete={(draftId) => void handleDelete(draftId)}
			/>
		</div>
	);
}
