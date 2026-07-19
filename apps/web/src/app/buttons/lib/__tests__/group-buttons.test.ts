import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { groupByUsageTag, groupByVideo } from "../group-buttons";

function makeButton(
	id: string,
	tags: string[],
	videoId = "v1",
	createdAt = "2026-07-01T00:00:00.000Z",
): AudioButtonPlainObject {
	return {
		id,
		buttonText: `ボタン${id}`,
		videoId,
		videoTitle: `動画${videoId}`,
		videoThumbnailUrl: `https://example.com/${videoId}.jpg`,
		startTime: 0,
		endTime: 1,
		duration: 1,
		tags,
		creatorId: "u1",
		creatorName: "作成者",
		isPublic: true,
		stats: { playCount: 0, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
		createdAt,
		updatedAt: createdAt,
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText: "",
			durationText: "1秒",
			relativeTimeText: "1日前",
		},
	} as AudioButtonPlainObject;
}

describe("groupByUsageTag", () => {
	it("公式語彙の表示順でグループ化し、出典系タグは無視する", () => {
		const buttons = [
			makeButton("b1", ["龍が如く極", "名言・迷言"]),
			makeButton("b2", ["あいさつ"]),
			makeButton("b3", ["名言・迷言"]),
		];

		const groups = groupByUsageTag(buttons, 10);

		expect(groups.map((g) => g.title)).toEqual(["あいさつ", "名言・迷言"]);
		expect(groups[1]?.buttons.map((b) => b.id)).toEqual(["b1", "b3"]);
		expect(groups[1]?.moreHref).toBe(`/buttons?tags=${encodeURIComponent("名言・迷言")}`);
	});

	it("cap を超えるグループは表示を丸めて total に総数を残す", () => {
		const buttons = Array.from({ length: 5 }, (_, i) => makeButton(`b${i}`, ["笑い"]));

		const groups = groupByUsageTag(buttons, 3);

		expect(groups[0]?.total).toBe(5);
		expect(groups[0]?.buttons).toHaveLength(3);
	});

	it("用途タグなしのボタンは末尾の「未分類」グループに入る", () => {
		const buttons = [makeButton("b1", ["あいさつ"]), makeButton("b2", ["龍が如く極"])];

		const groups = groupByUsageTag(buttons, 10);

		expect(groups.map((g) => g.title)).toEqual(["あいさつ", "未分類"]);
		expect(groups[1]?.buttons.map((b) => b.id)).toEqual(["b2"]);
	});
});

describe("groupByVideo", () => {
	it("動画ごとにまとめ、最新ボタンの作成日時が新しい動画から並べる", () => {
		const buttons = [
			makeButton("old", [], "v1", "2026-06-01T00:00:00.000Z"),
			makeButton("newer", [], "v2", "2026-07-10T00:00:00.000Z"),
			makeButton("newest-in-v1", [], "v1", "2026-07-15T00:00:00.000Z"),
		];

		const groups = groupByVideo(buttons, 10);

		expect(groups.map((g) => g.key)).toEqual(["v1", "v2"]);
		expect(groups[0]?.total).toBe(2);
		expect(groups[0]?.videoHref).toBe("/videos/v1");
		expect(groups[0]?.moreHref).toBe("/buttons?videoId=v1");
	});

	it("サムネイル未設定なら YouTube のサムネイルへフォールバックする", () => {
		const button = makeButton("b1", [], "vX");
		button.videoThumbnailUrl = undefined;

		const groups = groupByVideo([button], 10);

		expect(groups[0]?.thumbnailUrl).toBe("https://img.youtube.com/vi/vX/hqdefault.jpg");
	});
});
