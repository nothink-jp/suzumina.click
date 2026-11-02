/**
 * 動画タイプ（VideoType）判定の正本。
 *
 * 判定はこの関数 1 つだけ。書き込み側（functions の video-mapper が YouTube API から写像して
 * Firestore のトップレベル `videoType` に保存）と読み取り側（videoTransformers.fromFirestore が
 * `_computed.videoType` を算出）の両方がここを呼ぶ。以前は両側に別ルールの判定があり、
 * short・live・premiere の境界が食い違っていた。
 *
 * 読み取り側は保存済み `videoType` を信用せずに毎回ここで判定し直す。判定に「今」が入る
 * （予定時刻を過ぎたか）ため、保存値は取得時点のスナップショットでしかない。
 * `_computed` は toFirestore で落とされ Firestore には保存されない。
 */

import type { VideoType } from "../types/firestore/video";
import { parseDurationToSeconds } from "../utilities/formatters/time-format";

/** これを超える長さで終了した配信は配信アーカイブ（音声ボタン作成可）。以下はプレミア公開扱い */
const ARCHIVE_MIN_SECONDS = 15 * 60;
/** これ未満の通常動画は short */
const SHORT_MAX_SECONDS = 60;
/**
 * 予定時刻を過ぎて未開始の配信を possibly_live とみなす上限。超えたら upcoming に戻す（SPR-404）。
 * 配信中・予定の動画は 15 分毎に再取得される（run-video-fetch の runFastRecheck）ので、実際に始まった配信は
 * ふつう 15 分以内に live になる。上限に掛かるのは YouTube 側が予定のまま放置した枠（フリーチャット枠等）や、
 * 削除・非公開で更新が止まった動画。upcoming は YouTube の表示（予定のまま）に合わせた選択。
 */
const POSSIBLY_LIVE_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * 配信中として扱う videoType か。possibly_live（予定時刻を過ぎたが未確認）も含める。
 * マーキング画面（video-mode）・/watch・バッジ（配信中（推定））がいずれも配信中側に寄せているのに揃える。
 */
export function isLiveVideoType(videoType: VideoType): boolean {
	return videoType === "live" || videoType === "possibly_live";
}

/**
 * 判定に必要なフィールドだけを持つ入力。YouTube API・Firestore 生データ・VideoPlainObject の
 * どれでも渡せるよう、時刻は string / Date / Firestore Timestamp を受け付ける。
 */
export interface VideoTypeSource {
	title?: string | null;
	description?: string | null;
	duration?: string | null;
	liveStreamingDetails?: {
		scheduledStartTime?: unknown;
		actualStartTime?: unknown;
		actualEndTime?: unknown;
	} | null;
}

function toDate(value: unknown): Date | undefined {
	if (!value) return undefined;
	if (value instanceof Date) return value;
	if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
		return value.toDate() as Date;
	}
	if (typeof value === "string" || typeof value === "number") {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? undefined : date;
	}
	return undefined;
}

/**
 * 動画タイプを判定する（純関数。`now` を渡せば決定論的）。
 *
 * 配信情報（liveStreamingDetails）があれば #shorts や長さより優先する:
 * - actualEndTime あり → 長さ 15 分超なら `archived`、以下なら `premiere`
 * - actualStartTime あり（未終了）→ `live`
 * - scheduledStartTime が未来 → `upcoming`
 * - scheduledStartTime が過去 24 時間以内（未開始のまま）→ `possibly_live`。最後の取得時点では未開始で、
 *   その後再取得されていない状態。配信中の可能性が高いが、遅延・中止もありうるので `live` と断定しない
 * - scheduledStartTime から 24 時間以上経っても未開始 → `upcoming`（POSSIBLY_LIVE_MAX_MS 参照）
 * - 時刻情報が 1 つもない → 配信の根拠がないので通常動画として扱う
 *
 * 配信情報がなければ、タイトル/説明に `#shorts` を含むか 60 秒未満なら `short`、それ以外は `normal`。
 */
export function determineVideoType(video: VideoTypeSource, now: Date = new Date()): VideoType {
	return determineStreamType(video, now) ?? determineUploadType(video);
}

/** 配信情報から判定する。配信の根拠となる時刻が 1 つもなければ undefined */
function determineStreamType(video: VideoTypeSource, now: Date): VideoType | undefined {
	const live = video.liveStreamingDetails;
	if (!live) return undefined;
	if (live.actualEndTime) {
		return parseDurationToSeconds(video.duration ?? undefined) > ARCHIVE_MIN_SECONDS
			? "archived"
			: "premiere";
	}
	if (live.actualStartTime) return "live";
	const scheduled = toDate(live.scheduledStartTime);
	if (!scheduled) return undefined;
	if (scheduled > now) return "upcoming";
	return now.getTime() - scheduled.getTime() < POSSIBLY_LIVE_MAX_MS ? "possibly_live" : "upcoming";
}

/** 配信でない動画を short / normal に分ける */
function determineUploadType(video: VideoTypeSource): VideoType {
	if (video.title?.includes("#shorts") || video.description?.includes("#shorts")) {
		return "short";
	}
	const seconds = parseDurationToSeconds(video.duration ?? undefined);
	return seconds > 0 && seconds < SHORT_MAX_SECONDS ? "short" : "normal";
}
