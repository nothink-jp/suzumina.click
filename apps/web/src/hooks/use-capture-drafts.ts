"use client";

import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { type RefObject, useCallback, useMemo, useState } from "react";
import {
	createButtonDraft,
	deleteButtonDraft,
	updateButtonDraftPlayerTime,
} from "@/actions/button-drafts";
import { groupDraftsByVideo } from "@/components/capture/draft-groups";
import { findNearbyDraft } from "@/components/capture/mark-proximity";
import { trackMarkDraft } from "@/lib/analytics/events";
import { formatSeconds } from "@/utils/format-seconds";

interface UseCaptureDraftsParams {
	video: VideoPlainObject | null;
	/** 埋め込み不可ならプレイヤーが動かないためマーク自体を止める */
	isEmbeddable: boolean;
	initialDrafts: AudioButtonDraft[];
	playerRef: RefObject<YTPlayer | null>;
}

/**
 * マーキング画面の下書き状態（マーク・微調整・削除）をまとめて持つ。
 *
 * 保存するのは生の捕捉信号だけ（playerTime = 主信号 / markedAt = 壁時計フォールバック・SPR-145）。
 * 推奨開始秒は保存せず playerTime から導出する。
 */
export function useCaptureDrafts({
	video,
	isEmbeddable,
	initialDrafts,
	playerRef,
}: UseCaptureDraftsParams) {
	const [drafts, setDrafts] = useState<AudioButtonDraft[]>(initialDrafts);
	// 動画単位のキュー表示（SPR-266 第2段）。直近の配信グループが先頭
	const draftGroups = useMemo(() => groupDraftsByVideo(drafts), [drafts]);
	const [isMarking, setIsMarking] = useState(false);
	const [isAdjusting, setIsAdjusting] = useState(false);
	const [justMarked, setJustMarked] = useState(false);
	const [error, setError] = useState("");
	// error と分けるのは、近接マークが「保存はできたが確認してほしい」情報であるため
	const [notice, setNotice] = useState("");

	/** 直前のマーク（表示中の動画の最新下書き）。壁時計のみモードは位置を持たず微調整できない */
	const lastDraft = drafts.find(
		(draft) => draft.videoId === video?.videoId && draft.playerTime != null,
	);

	const readPlayerTime = useCallback((): number | null => {
		try {
			const seconds = playerRef.current?.getCurrentTime?.();
			if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
				return Math.round(seconds * 1000) / 1000;
			}
		} catch {
			// noop: 壁時計のみモードへ劣化
		}
		return null;
	}, [playerRef]);

	const mark = useCallback(async () => {
		// isMarking ガードは M キーの素早い2連打による二重作成防止（ボタンの disabled では keydown を防げない）。
		// isEmbeddable も同様にキー経路を塞ぐ（ボタン自体は描画されない）
		if (!video || isMarking || !isEmbeddable) {
			return;
		}
		setIsMarking(true);
		setError("");
		setNotice("");

		const playerTime = readPlayerTime();
		// 巻き戻して同じ場面を二度マークしたケースの気づき。保存は止めない（消すのは後からできる）
		const nearby = playerTime == null ? null : findNearbyDraft(drafts, video.videoId, playerTime);

		try {
			const result = await createButtonDraft({
				videoId: video.videoId,
				videoTitle: video.title,
				playerTime,
				markedAtMs: Date.now(),
			});

			if (!result.success) {
				setError(result.error);
				return;
			}

			setDrafts((prev) => [result.data, ...prev]);
			trackMarkDraft(video.videoId, playerTime != null);
			setJustMarked(true);
			setTimeout(() => setJustMarked(false), 600);
			if (nearby) {
				setNotice(
					`近くに既存のマークがあります（${formatSeconds(nearby.suggestedStartTime)} から）。重複なら削除してください。`,
				);
			}
		} catch {
			setError("下書きの保存に失敗しました");
		} finally {
			setIsMarking(false);
		}
	}, [video, isMarking, isEmbeddable, drafts, readPlayerTime]);

	const adjust = useCallback(
		async (deltaSeconds: number) => {
			const current = lastDraft?.playerTime;
			if (!lastDraft || current == null || isAdjusting) {
				return;
			}
			setIsAdjusting(true);
			setError("");
			const result = await updateButtonDraftPlayerTime(
				lastDraft.id,
				Math.max(0, current + deltaSeconds),
			);
			if (result.success) {
				setDrafts((prev) => prev.map((d) => (d.id === result.data.id ? result.data : d)));
			} else {
				setError(result.error);
			}
			setIsAdjusting(false);
		},
		[lastDraft, isAdjusting],
	);

	const remove = useCallback(async (draftId: string) => {
		const result = await deleteButtonDraft(draftId);
		if (result.success) {
			setDrafts((prev) => prev.filter((d) => d.id !== draftId));
		} else {
			setError(result.error ?? "下書きの削除に失敗しました");
		}
	}, []);

	return {
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
	};
}
