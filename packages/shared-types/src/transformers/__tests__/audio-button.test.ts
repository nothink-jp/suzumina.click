import { describe, expect, it, vi } from "vitest";
import { fromFirestore, toFirestore } from "../audio-button";

const CREATED_AT = "2024-01-01T00:00:00.000Z";
/** fromFirestore が受け付ける最小の必須フィールド（buttonText / videoId / createdAt） */
const minimal = { buttonText: "a", videoId: "v", createdAt: CREATED_AT };

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
		createdAt: CREATED_AT,
	});
	if (!ab) throw new Error("fixture 生成に失敗");
	return ab;
};

describe("fromFirestore", () => {
	it("buttonText / videoId / createdAt のいずれかが無ければ null", () => {
		expect(fromFirestore({})).toBeNull();
		expect(fromFirestore({ buttonText: "a", createdAt: CREATED_AT })).toBeNull();
		expect(fromFirestore({ videoId: "v", createdAt: CREATED_AT })).toBeNull();
		expect(fromFirestore({ buttonText: "a", videoId: "v" })).toBeNull();
	});

	it.each([
		{ label: "空文字", createdAt: "" },
		{ label: "解釈できない形", createdAt: {} },
	])("createdAt が $label なら null（現在時刻で埋めない）", ({ createdAt }) => {
		expect(fromFirestore({ ...minimal, createdAt })).toBeNull();
	});

	it("レガシーなフィールド名のゆれを吸収する", () => {
		const result = fromFirestore({
			id: "id1",
			title: "旧タイトル", // → buttonText
			sourceVideoId: "vsrc", // → videoId
			sourceVideoTitle: "旧動画", // → videoTitle
			createdBy: "creator-legacy", // → creatorId
			createdByName: "作者旧", // → creatorName
			createdAt: CREATED_AT,
		});
		expect(result).not.toBeNull();
		expect(result?.buttonText).toBe("旧タイトル");
		expect(result?.videoId).toBe("vsrc");
		expect(result?.creatorId).toBe("creator-legacy");
		expect(result?.creatorName).toBe("作者旧");
	});

	it("creatorId/creatorName 欠落時は unknown/Unknown", () => {
		const result = fromFirestore(minimal);
		expect(result?.creatorId).toBe("unknown");
		expect(result?.creatorName).toBe("Unknown");
	});

	it("stats はネスト優先・フラットにフォールバックする", () => {
		const nested = fromFirestore({
			...minimal,
			stats: { playCount: 200, likeCount: 5, dislikeCount: 1 },
			playCount: 999, // ネストがあるので無視される
		});
		expect(nested?.stats.playCount).toBe(200);
		// engagementRate = (5+1)/200
		expect(nested?.stats.engagementRate).toBeCloseTo(0.03);

		const flat = fromFirestore({ ...minimal, playCount: 50, likeCount: 10 });
		expect(flat?.stats.playCount).toBe(50);
	});

	it.each([
		{ stats: { playCount: 99, likeCount: 49, dislikeCount: 0 }, expected: false },
		{ stats: { playCount: 100, likeCount: 0, dislikeCount: 0 }, expected: true },
		{ stats: { playCount: 0, likeCount: 40, dislikeCount: 10 }, expected: true },
	])(
		"isPopular は 再生数>=100 または 高評価+低評価>=50（$stats → $expected）",
		({ stats, expected }) => {
			expect(fromFirestore({ ...minimal, stats })?._computed.isPopular).toBe(expected);
		},
	);

	it("engagementRatePercentage は整数に丸める", () => {
		const r = fromFirestore({
			...minimal,
			stats: { playCount: 3, likeCount: 1, dislikeCount: 0 },
		});
		expect(r?._computed.engagementRatePercentage).toBe(33);
	});

	it("isPopular は playCount>=100、popularityScore を算出する", () => {
		const result = fromFirestore({
			...minimal,
			stats: { playCount: 100, likeCount: 3, dislikeCount: 1 },
		});
		expect(result?._computed?.isPopular).toBe(true);
		// 100 + 3*2 - 1 = 105
		expect(result?._computed?.popularityScore).toBe(105);
	});

	it("時間フィールドは startTime/endTime/duration を補完する", () => {
		// endTime 未指定 → startTime と同値、duration=0
		const r1 = fromFirestore({ ...minimal, startTime: 5 });
		expect(r1?.endTime).toBe(5);
		expect(r1?.duration).toBe(0);
		// duration は endTime-startTime
		const r2 = fromFirestore({ ...minimal, startTime: 2, endTime: 8 });
		expect(r2?.duration).toBe(6);
	});

	it("isPublic は未指定で true", () => {
		expect(fromFirestore(minimal)?.isPublic).toBe(true);
		expect(fromFirestore({ ...minimal, isPublic: false })?.isPublic).toBe(false);
	});

	it("createdAt の各形式を ISO 文字列に変換する", () => {
		const fromStr = fromFirestore({
			...minimal,
			createdAt: "2024-01-01T00:00:00.000Z",
		});
		expect(fromStr?.createdAt).toBe("2024-01-01T00:00:00.000Z");

		const fromToDate = fromFirestore({
			...minimal,
			createdAt: { toDate: () => new Date("2024-02-02T00:00:00.000Z") },
		});
		expect(fromToDate?.createdAt).toBe("2024-02-02T00:00:00.000Z");

		const fromSeconds = fromFirestore({
			...minimal,
			createdAt: { _seconds: 1700000000 },
		});
		expect(fromSeconds?.createdAt).toBe(new Date(1700000000 * 1000).toISOString());

		const fromEpoch = fromFirestore({ ...minimal, createdAt: { _seconds: 0 } });
		expect(fromEpoch?.createdAt).toBe("1970-01-01T00:00:00.000Z");
	});

	it("createdAt が Date でも ISO 文字列に変換する", () => {
		const r = fromFirestore({
			...minimal,
			createdAt: new Date("2024-03-03T00:00:00.000Z"),
		});
		expect(r?.createdAt).toBe("2024-03-03T00:00:00.000Z");
	});

	it("変換結果は現在時刻に依存しない（キャッシュ越しでも値がずれない）", () => {
		const input = { ...minimal, createdAt: "2024-01-10T09:00:00.000Z" };
		try {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2024-01-10T12:00:00.000Z"));
			const early = fromFirestore(input);
			vi.setSystemTime(new Date("2025-01-10T12:00:00.000Z"));
			expect(fromFirestore(input)).toEqual(early);
		} finally {
			vi.useRealTimers();
		}
	});

	it("updatedAt があればそれを、未指定・解釈できなければ createdAt を使う", () => {
		expect(fromFirestore({ ...minimal, updatedAt: "2024-05-05T00:00:00.000Z" })?.updatedAt).toBe(
			"2024-05-05T00:00:00.000Z",
		);
		expect(fromFirestore(minimal)?.updatedAt).toBe(CREATED_AT);
		expect(fromFirestore({ ...minimal, updatedAt: {} })?.updatedAt).toBe(CREATED_AT);
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
			const r = fromFirestore({ ...minimal, startTime, endTime });
			expect(r?._computed?.durationText).toBe(expected);
		},
	);

	it("duration から durationText を算出する（formatDuration 正本）", () => {
		const fromFs = fromFirestore({ ...minimal, startTime: 0, endTime: 5 });
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
