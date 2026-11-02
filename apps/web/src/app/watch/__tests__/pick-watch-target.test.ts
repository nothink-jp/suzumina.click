import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { pickWatchTarget } from "../pick-watch-target";

const NOW = new Date("2026-01-10T00:00:00.000Z");

const video = (id: string, videoType: string, scheduledStartTime?: string): VideoPlainObject =>
	({
		videoId: id,
		liveStreamingDetails: scheduledStartTime ? { scheduledStartTime } : undefined,
		_computed: { videoType },
	}) as VideoPlainObject;

describe("pickWatchTarget（/watch の自動選択）", () => {
	it("配信中（possibly_live を含む）を配信予定より優先する", () => {
		const items = [
			video("next", "upcoming", "2026-01-10T01:00:00.000Z"),
			video("live", "possibly_live", "2026-01-09T23:00:00.000Z"),
		];
		expect(pickWatchTarget(items, NOW)?.videoId).toBe("live");
	});

	it("配信予定は予定時刻が近い順で、過去の予定時刻の放置枠は選ばない（SPR-404）", () => {
		const items = [
			video("later", "upcoming", "2026-01-12T00:00:00.000Z"),
			video("abandoned", "upcoming", "2025-12-01T00:00:00.000Z"),
			video("next", "upcoming", "2026-01-10T01:00:00.000Z"),
		];
		expect(pickWatchTarget(items, NOW)?.videoId).toBe("next");
	});

	it("放置枠しか無ければ何も選ばない（選択状態にする）", () => {
		const items = [
			video("abandoned", "upcoming", "2025-12-01T00:00:00.000Z"),
			video("archived", "archived"),
		];
		expect(pickWatchTarget(items, NOW)).toBeNull();
	});
});
