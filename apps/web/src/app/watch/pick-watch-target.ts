import { isLiveVideoType, type VideoPlainObject } from "@suzumina.click/shared-types";

/**
 * /watch の無指定時の自動選択（配信中 → 直近の配信予定）。判定の正本は _computed.videoType
 * （video-card-actions / video-badge と同一。raw の liveBroadcastContent は stale がありうるため使わない）。
 *
 * 配信予定は予定時刻が `now` より後のものだけを候補にする。予定時刻から 24 時間を過ぎて未開始の
 * 放置枠（フリーチャット枠等）も videoType は upcoming に戻る（SPR-404）ため、昇順の先頭に来て
 * 本当の次の配信より先に選ばれてしまうのを防ぐ。
 */
export function pickWatchTarget(
	items: VideoPlainObject[],
	now: Date = new Date(),
): VideoPlainObject | null {
	const live = items.find((v) => isLiveVideoType(v._computed.videoType));
	if (live) {
		return live;
	}

	const scheduledAt = (v: VideoPlainObject) =>
		new Date(v.liveStreamingDetails?.scheduledStartTime ?? Number.NaN).getTime();
	const upcoming = items
		.filter((v) => v._computed.videoType === "upcoming" && scheduledAt(v) > now.getTime())
		.sort((a, b) => scheduledAt(a) - scheduledAt(b));
	return upcoming[0] ?? null;
}
