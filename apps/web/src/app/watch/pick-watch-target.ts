import {
	determineVideoType,
	isLiveVideoType,
	type VideoPlainObject,
} from "@suzumina.click/shared-types";

/**
 * /watch の無指定時の自動選択（配信中 → 直近の配信予定）。
 *
 * videoType は `_computed.videoType` ではなく、正本の determineVideoType で**リクエスト時刻**に判定し直す。
 * `_computed` は一覧の "use cache" を作った時刻で固定されるため、キャッシュ後に予定時刻を過ぎた枠が
 * upcoming のまま残り、配信開始の時間帯に配信中として拾えなくなる（自動選択は配信時の即応性のための便宜）。
 *
 * 配信予定は予定時刻が `now` より後のものだけを候補にする。予定時刻から 24 時間を過ぎて未開始の
 * 放置枠（フリーチャット枠等）も upcoming に戻る（SPR-404）ため、昇順の先頭に来て本当の次の配信より
 * 先に選ばれてしまうのを防ぐ。
 */
export function pickWatchTarget(
	items: VideoPlainObject[],
	now: Date = new Date(),
): VideoPlainObject | null {
	const typed = items.map((video) => ({ video, type: determineVideoType(video, now) }));

	const live = typed.find(({ type }) => isLiveVideoType(type));
	if (live) {
		return live.video;
	}

	const scheduledAt = (v: VideoPlainObject) =>
		new Date(v.liveStreamingDetails?.scheduledStartTime ?? Number.NaN).getTime();
	const upcoming = typed
		.filter(({ video, type }) => type === "upcoming" && scheduledAt(video) > now.getTime())
		.map(({ video }) => video)
		.sort((a, b) => scheduledAt(a) - scheduledAt(b));
	return upcoming[0] ?? null;
}
