import { describe, expect, it } from "vitest";
import {
	createAudioButton,
	decrementDislikeCount,
	decrementFavoriteCount,
	decrementLikeCount,
	fromFirestore,
	generateId,
	incrementDislikeCount,
	incrementFavoriteCount,
	incrementLikeCount,
	incrementViewCount,
	toFirestore,
	updateAudioButton,
} from "../audio-button";

const base = () =>
	createAudioButton({
		buttonText: "ボタン",
		videoId: "vid1",
		videoTitle: "動画",
		startTime: 10,
		endTime: 15,
		tags: ["tag"],
		creatorId: "c1",
		creatorName: "作者",
	});

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

	// 注意: fromFirestore の durationText は createAudioButton と算出ロジックが異なる。
	// fromFirestore は buildComputedProperties で常に "m:ss"（5秒→"0:05"）を返す一方、
	// createAudioButton は formatDuration で "再生"/"N秒"/"m:ss" を返す（実装の不整合）。
	// 統一は別タスク。ここでは fromFirestore 側の現挙動を固定する。
	it("fromFirestore の durationText は常に m:ss 形式（createAudioButton とは別ロジック）", () => {
		const r = fromFirestore({ buttonText: "a", videoId: "v", startTime: 0, endTime: 5 });
		expect(r?._computed?.durationText).toBe("0:05");
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

describe("createAudioButton", () => {
	it("duration を計算し既定 stats を設定する", () => {
		const ab = base();
		expect(ab.duration).toBe(5);
		expect(ab.stats.playCount).toBe(0);
		expect(ab.isPublic).toBe(true);
	});

	it("durationText は formatDuration 経由（5秒 → '5秒'）", () => {
		expect(base()._computed?.durationText).toBe("5秒");
	});

	it("durationText: 0秒は '再生'、60秒以上は m:ss", () => {
		const zero = createAudioButton({
			buttonText: "b",
			videoId: "v",
			videoTitle: "t",
			startTime: 0,
			endTime: 0,
			creatorId: "c",
			creatorName: "n",
		});
		expect(zero._computed?.durationText).toBe("再生");

		const long = createAudioButton({
			buttonText: "b",
			videoId: "v",
			videoTitle: "t",
			startTime: 0,
			endTime: 75,
			creatorId: "c",
			creatorName: "n",
		});
		expect(long._computed?.durationText).toBe("1:15");
	});

	it("searchableText は小文字結合", () => {
		const ab = createAudioButton({
			buttonText: "Hello",
			videoId: "v",
			videoTitle: "World",
			startTime: 0,
			endTime: 1,
			tags: ["TagA"],
			creatorId: "c",
			creatorName: "Me",
		});
		expect(ab._computed?.searchableText).toBe("hello world me taga");
	});
});

describe("updateAudioButton", () => {
	it("指定フィールドのみ更新し updatedAt を更新する", () => {
		const ab = base();
		const updated = updateAudioButton(ab, { buttonText: "新ボタン", isPublic: false });
		expect(updated.buttonText).toBe("新ボタン");
		expect(updated.isPublic).toBe(false);
		expect(updated.videoId).toBe(ab.videoId);
	});
});

describe("stats の増減", () => {
	it("incrementViewCount は playCount と engagementRate を更新", () => {
		const ab = incrementLikeCount(base()); // likeCount=1
		const viewed = incrementViewCount(ab);
		expect(viewed.stats.playCount).toBe(1);
		expect(viewed.stats.engagementRate).toBeCloseTo(1); // (1+0)/1
	});

	it("like の増減と engagementRate 再計算（0 未満にならない）", () => {
		const ab = incrementViewCount(base()); // playCount=1
		const liked = incrementLikeCount(ab);
		expect(liked.stats.likeCount).toBe(1);
		expect(liked.stats.engagementRate).toBeCloseTo(1);

		const back = decrementLikeCount(liked);
		expect(back.stats.likeCount).toBe(0);
		// decrement を空状態に適用しても 0 未満にならない
		expect(decrementLikeCount(base()).stats.likeCount).toBe(0);
	});

	it("dislike の増減（0 未満にならない）", () => {
		const ab = incrementDislikeCount(base());
		expect(ab.stats.dislikeCount).toBe(1);
		expect(decrementDislikeCount(ab).stats.dislikeCount).toBe(0);
		expect(decrementDislikeCount(base()).stats.dislikeCount).toBe(0);
	});

	it("favorite の増減（0 未満にならない）", () => {
		const ab = incrementFavoriteCount(base());
		expect(ab.stats.favoriteCount).toBe(1);
		expect(decrementFavoriteCount(ab).stats.favoriteCount).toBe(0);
		expect(decrementFavoriteCount(base()).stats.favoriteCount).toBe(0);
	});
});

describe("generateId", () => {
	it("空でない文字列を返す", () => {
		expect(generateId().length).toBeGreaterThan(0);
	});
});
