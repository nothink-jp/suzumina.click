import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { DUPLICATE_MARK_THRESHOLD_SECONDS, findNearbyDraft } from "../mark-proximity";

function makeDraft(id: string, videoId: string, playerTime: number | null): AudioButtonDraft {
	return {
		id,
		videoId,
		videoTitle: "テスト動画",
		playerTime,
		markedAt: "2026-07-18T12:00:00.000Z",
		createdAt: "2026-07-18T12:00:00.000Z",
		suggestedStartTime: playerTime == null ? 0 : Math.max(0, Math.floor(playerTime) - 15),
	};
}

describe("findNearbyDraft", () => {
	const drafts = [
		makeDraft("far", "video-a", 500),
		makeDraft("near", "video-a", 104),
		makeDraft("nearer", "video-a", 101),
		makeDraft("other-video", "video-b", 100),
		makeDraft("wallclock-only", "video-a", null),
	];

	it("閾値内で最も近い下書きを返す", () => {
		expect(findNearbyDraft(drafts, "video-a", 100)?.id).toBe("nearer");
	});

	it("閾値外なら null（別の場面を新しくマークしただけ）", () => {
		expect(findNearbyDraft(drafts, "video-a", 300)).toBeNull();
	});

	it("別動画の下書きは対象にしない", () => {
		expect(findNearbyDraft([makeDraft("b1", "video-b", 100)], "video-a", 100)).toBeNull();
	});

	it("壁時計のみモードの下書きは位置を持たないため対象にしない", () => {
		expect(findNearbyDraft([makeDraft("w1", "video-a", null)], "video-a", 0)).toBeNull();
	});

	it("既定の閾値は境界を含む", () => {
		const boundary = makeDraft("boundary", "video-a", 100 + DUPLICATE_MARK_THRESHOLD_SECONDS);
		expect(findNearbyDraft([boundary], "video-a", 100)?.id).toBe("boundary");
	});
});
