import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { pickWatchTarget } from "../pick-watch-target";

const NOW = new Date("2026-01-10T00:00:00.000Z");

/**
 * `_computed.videoType` はキャッシュ作成時刻の値を模すため、あえて実データと食い違う値を入れられるようにする。
 * pickWatchTarget はこれを見ずに liveStreamingDetails から判定し直す。
 */
const video = (
	id: string,
	liveStreamingDetails?: VideoPlainObject["liveStreamingDetails"],
	cachedType = "normal",
): VideoPlainObject =>
	({
		videoId: id,
		title: id,
		duration: "PT1H",
		liveStreamingDetails,
		_computed: { videoType: cachedType },
	}) as VideoPlainObject;

describe("pickWatchTarget（/watch の自動選択）", () => {
	it("配信中を配信予定より優先する", () => {
		const items = [
			video("next", { scheduledStartTime: "2026-01-10T01:00:00.000Z" }),
			video("live", { actualStartTime: "2026-01-09T23:00:00.000Z" }),
		];
		expect(pickWatchTarget(items, NOW)?.videoId).toBe("live");
	});

	it("キャッシュ上は upcoming でも、リクエスト時刻に予定時刻を過ぎていれば配信中（推定）として選ぶ", () => {
		const items = [
			video("next", { scheduledStartTime: "2026-01-10T01:00:00.000Z" }, "upcoming"),
			video("starting", { scheduledStartTime: "2026-01-09T23:55:00.000Z" }, "upcoming"),
		];
		expect(pickWatchTarget(items, NOW)?.videoId).toBe("starting");
	});

	it("配信予定は予定時刻が近い順で、24 時間を過ぎた放置枠は選ばない（SPR-404）", () => {
		const items = [
			video("later", { scheduledStartTime: "2026-01-12T00:00:00.000Z" }),
			video("abandoned", { scheduledStartTime: "2025-12-01T00:00:00.000Z" }),
			video("next", { scheduledStartTime: "2026-01-10T01:00:00.000Z" }),
		];
		expect(pickWatchTarget(items, NOW)?.videoId).toBe("next");
	});

	it("放置枠しか無ければ何も選ばない（選択状態にする）", () => {
		const items = [
			video("abandoned", { scheduledStartTime: "2025-12-01T00:00:00.000Z" }),
			video("archived", { actualEndTime: "2025-12-01T03:00:00.000Z" }),
		];
		expect(pickWatchTarget(items, NOW)).toBeNull();
	});
});
