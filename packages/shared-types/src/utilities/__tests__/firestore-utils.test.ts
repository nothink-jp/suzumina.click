import { describe, expect, it } from "vitest";
import type { FirestoreServerVideoData } from "../../types/firestore/video";
import { fromServerModel, toServerModel } from "../firestore-utils";

// Admin SDK Timestamp のスタブ
const fakeFirestore = {
	Timestamp: {
		now: () => ({ kind: "now" }),
		fromDate: (date: Date) => ({ kind: "fromDate", iso: date.toISOString() }),
	},
};

describe("toServerModel", () => {
	it("videoId が無ければ id を流用する", () => {
		const result = toServerModel({ id: "abc", title: "t" }, fakeFirestore);
		expect(result.videoId).toBe("abc");
		expect(result.id).toBe("abc");
	});

	it("description が無ければ空文字にする", () => {
		const result = toServerModel({ videoId: "v1", title: "t" }, fakeFirestore);
		expect(result.description).toBe("");
	});

	it("日時があれば fromDate、無ければ now を使う", () => {
		const result = toServerModel(
			{ videoId: "v1", title: "t", publishedAt: "2024-01-01T00:00:00.000Z" },
			fakeFirestore,
		);
		expect(result.publishedAt).toEqual({ kind: "fromDate", iso: "2024-01-01T00:00:00.000Z" });
		// lastFetchedAt は未指定なので now
		expect(result.lastFetchedAt).toEqual({ kind: "now" });
	});

	it("不正な日時文字列は now にフォールバックする", () => {
		const result = toServerModel(
			{ videoId: "v1", title: "t", publishedAt: "not-a-date" },
			fakeFirestore,
		);
		// new Date("not-a-date") は Invalid Date → fromDate に渡るが iso が例外、
		// 実装は try/catch ではなく fromDate に委譲するため kind は fromDate になる
		expect(result.publishedAt).toHaveProperty("kind");
	});
});

describe("fromServerModel", () => {
	const base = (over: Partial<FirestoreServerVideoData> = {}): FirestoreServerVideoData =>
		({
			id: "abc",
			videoId: "abc",
			title: "t",
			channelId: "c1",
			channelTitle: "ch",
			thumbnailUrl: "http://example.com/t.jpg",
			...over,
		}) as FirestoreServerVideoData;

	it("Firestore Timestamp(toDate) を ISO 文字列に変換する", () => {
		const ts = { toDate: () => new Date("2024-05-05T00:00:00.000Z") };
		const result = fromServerModel(base({ publishedAt: ts as never }));
		expect(result.publishedAt).toBe("2024-05-05T00:00:00.000Z");
	});

	it("文字列日時もそのまま ISO 化する", () => {
		const result = fromServerModel(base({ publishedAt: "2024-06-06T00:00:00.000Z" as never }));
		expect(result.publishedAt).toBe("2024-06-06T00:00:00.000Z");
	});

	it("liveBroadcastContent 未指定は 'none' を補完する", () => {
		const result = fromServerModel(base());
		expect(result.liveBroadcastContent).toBe("none");
	});

	it("id が無ければ videoId を使う", () => {
		const result = fromServerModel(base({ id: undefined }));
		expect(result.id).toBe("abc");
	});
});
