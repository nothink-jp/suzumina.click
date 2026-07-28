import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { groupDraftsByVideo } from "../draft-groups";

function makeDraft(
	id: string,
	videoId: string,
	suggestedStartTime: number,
	createdAt: string,
): AudioButtonDraft {
	return {
		id,
		videoId,
		videoTitle: `動画 ${videoId}`,
		playerTime: suggestedStartTime + 15,
		markedAt: createdAt,
		createdAt,
		suggestedStartTime,
	};
}

describe("groupDraftsByVideo", () => {
	it("動画単位にグルーピングされ、グループ内は推奨開始秒の昇順になる", () => {
		const groups = groupDraftsByVideo([
			makeDraft("a1", "video-a", 300, "2026-07-15T12:10:00.000Z"),
			makeDraft("a2", "video-a", 100, "2026-07-15T12:05:00.000Z"),
			makeDraft("b1", "video-b", 50, "2026-07-10T10:00:00.000Z"),
		]);

		expect(groups).toHaveLength(2);
		expect(groups[0]?.videoId).toBe("video-a");
		expect(groups[0]?.drafts.map((d) => d.id)).toEqual(["a2", "a1"]);
		expect(groups[1]?.videoId).toBe("video-b");
	});

	it("グループは最新マークを含む順（直近の配信が先頭）", () => {
		const groups = groupDraftsByVideo([
			makeDraft("old1", "video-old", 10, "2026-07-01T10:00:00.000Z"),
			makeDraft("new1", "video-new", 10, "2026-07-15T10:00:00.000Z"),
			// 古い動画に後からマークが追加された場合はそのグループが繰り上がる
			makeDraft("old2", "video-old", 20, "2026-07-16T10:00:00.000Z"),
		]);

		expect(groups.map((g) => g.videoId)).toEqual(["video-old", "video-new"]);
		expect(groups[0]?.latestCreatedAt).toBe("2026-07-16T10:00:00.000Z");
	});

	it("空配列は空のグループ一覧", () => {
		expect(groupDraftsByVideo([])).toEqual([]);
	});
});
