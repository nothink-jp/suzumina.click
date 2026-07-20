import { describe, expect, it } from "vitest";
import { fromFirestore, toFirestore } from "../audio-button";

// createAudioButton 操作は削除されたため fromFirestore で AudioButton fixture を作る（SPR-197）
const base = () => {
	const ab = fromFirestore({
		id: "id1",
		buttonText: "ボタン",
		videoId: "vid1",
		videoTitle: "動画",
		startTime: 10,
		endTime: 15,
		tags: ["tag"],
		creatorId: "c1",
		creatorName: "作者",
	});
	if (!ab) throw new Error("fixture 生成に失敗");
	return ab;
};

describe("fromFirestore", () => {
	it("buttonText / videoId が無ければ null", () => {
		expect(fromFirestore({})).toBeNull();
		expect(fromFirestore({ buttonText: "a" })).toBeNull();
		expect(fromFirestore({ videoId: "v" })).toBeNull();
	});

	it("レガシーなフィールド名のゆれを吸収する", () => {
		const result = fromFirestore({
			id: "id1",
			title: "旧タイトル", // → buttonText
			sourceVideoId: "vsrc", // → videoId
			sourceVideoTitle: "旧動画", // → videoTitle
			createdBy: "creator-legacy", // → creatorId
			createdByName: "作者旧", // → creatorName
		});
		expect(result).not.toBeNull();
		expect(result?.buttonText).toBe("旧タイトル");
		expect(result?.videoId).toBe("vsrc");
		expect(result?.creatorId).toBe("creator-legacy");
		expect(result?.creatorName).toBe("作者旧");
	});

	it("creatorId/creatorName 欠落時は unknown/Unknown", () => {
		const result = fromFirestore({ buttonText: "a", videoId: "v" });
		expect(result?.creatorId).toBe("unknown");
		expect(result?.creatorName).toBe("Unknown");
	});

	it("stats はネスト優先・フラットにフォールバックする", () => {
		const nested = fromFirestore({
			buttonText: "a",
			videoId: "v",
			stats: { playCount: 200, likeCount: 5, dislikeCount: 1 },
			playCount: 999, // ネストがあるので無視される
		});
		expect(nested?.stats.playCount).toBe(200);
		// engagementRate = (5+1)/200
		expect(nested?.stats.engagementRate).toBeCloseTo(0.03);

		const flat = fromFirestore({ buttonText: "a", videoId: "v", playCount: 50, likeCount: 10 });
		expect(flat?.stats.playCount).toBe(50);
	});

	it("isPopular は playCount>=100、popularityScore を算出する", () => {
		const result = fromFirestore({
			buttonText: "a",
			videoId: "v",
			stats: { playCount: 100, likeCount: 3, dislikeCount: 1 },
		});
		expect(result?._computed?.isPopular).toBe(true);
		// 100 + 3*2 - 1 = 105
		expect(result?._computed?.popularityScore).toBe(105);
	});

	it("時間フィールドは startTime/endTime/duration を補完する", () => {
		// endTime 未指定 → startTime と同値、duration=0
		const r1 = fromFirestore({ buttonText: "a", videoId: "v", startTime: 5 });
		expect(r1?.endTime).toBe(5);
		expect(r1?.duration).toBe(0);
		// duration は endTime-startTime
		const r2 = fromFirestore({ buttonText: "a", videoId: "v", startTime: 2, endTime: 8 });
		expect(r2?.duration).toBe(6);
	});

	it("isPublic は未指定で true", () => {
		expect(fromFirestore({ buttonText: "a", videoId: "v" })?.isPublic).toBe(true);
		expect(fromFirestore({ buttonText: "a", videoId: "v", isPublic: false })?.isPublic).toBe(false);
	});

	it("createdAt の各形式を ISO 文字列に変換する", () => {
		const fromStr = fromFirestore({
			buttonText: "a",
			videoId: "v",
			createdAt: "2024-01-01T00:00:00.000Z",
		});
		expect(fromStr?.createdAt).toBe("2024-01-01T00:00:00.000Z");

		const fromToDate = fromFirestore({
			buttonText: "a",
			videoId: "v",
			createdAt: { toDate: () => new Date("2024-02-02T00:00:00.000Z") },
		});
		expect(fromToDate?.createdAt).toBe("2024-02-02T00:00:00.000Z");

		const fromSeconds = fromFirestore({
			buttonText: "a",
			videoId: "v",
			createdAt: { _seconds: 1700000000 },
		});
		expect(fromSeconds?.createdAt).toBe(new Date(1700000000 * 1000).toISOString());
	});

	it("updatedAt 未指定時は createdAt にフォールバックする", () => {
		const r = fromFirestore({
			buttonText: "a",
			videoId: "v",
			createdAt: "2024-01-01T00:00:00.000Z",
		});
		expect(r?.updatedAt).toBe("2024-01-01T00:00:00.000Z");
	});

	// durationText は formatDuration を正本とし、createAudioButton と同一表記に統一済み。
	// 0秒→"再生" / <60秒→"N秒" / 60秒以上→"m:ss"。
	it.each([
		{ startTime: 0, endTime: 0, expected: "再生" },
		{ startTime: 0, endTime: 5, expected: "5秒" },
		{ startTime: 0, endTime: 59, expected: "59秒" },
		{ startTime: 0, endTime: 60, expected: "1:00" },
		{ startTime: 0, endTime: 75, expected: "1:15" },
	])(
		"fromFirestore の durationText は $expected（start=$startTime end=$endTime）",
		({ startTime, endTime, expected }) => {
			const r = fromFirestore({ buttonText: "a", videoId: "v", startTime, endTime });
			expect(r?._computed?.durationText).toBe(expected);
		},
	);

	it("duration から durationText を算出する（formatDuration 正本）", () => {
		const fromFs = fromFirestore({ buttonText: "a", videoId: "v", startTime: 0, endTime: 5 });
		expect(fromFs?._computed?.durationText).toBe("5秒");
	});
});

describe("toFirestore", () => {
	it("id と _computed を除外する", () => {
		const doc = toFirestore(base()) as unknown as Record<string, unknown>;
		expect(doc.id).toBeUndefined();
		expect(doc._computed).toBeUndefined();
		expect(doc.buttonText).toBe("ボタン");
	});
});
