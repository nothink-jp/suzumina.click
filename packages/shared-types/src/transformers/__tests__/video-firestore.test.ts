import { describe, expect, it } from "vitest";
import type { VideoPlainObject } from "../../plain-objects/video-plain";
import type { FirestoreServerVideoData } from "../../types/firestore/video";
import { fromFirestore, toFirestore } from "../video-firestore";

const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";

const doc = (over: Partial<FirestoreServerVideoData> = {}): FirestoreServerVideoData =>
	({
		videoId: "vid1",
		title: "動画",
		channelId: "c1",
		channelTitle: "ch",
		publishedAt: "2024-01-01T00:00:00.000Z",
		lastFetchedAt: "2024-01-02T00:00:00.000Z",
		thumbnailUrl: "http://example.com/t.jpg",
		...over,
	}) as FirestoreServerVideoData;

describe("fromFirestore", () => {
	it("Date のタイムスタンプは ISO 文字列へ、文字列はそのまま", () => {
		const r = fromFirestore(doc({ publishedAt: new Date("2024-03-03T00:00:00.000Z") as never }));
		expect(r.publishedAt).toBe("2024-03-03T00:00:00.000Z");
		expect(r.lastFetchedAt).toBe("2024-01-02T00:00:00.000Z");
	});

	it("liveStreamingDetails が無ければ undefined・videoType は normal", () => {
		const r = fromFirestore(doc());
		expect(r.liveStreamingDetails).toBeUndefined();
		expect(r._computed.videoType).toBe("normal");
		expect(r._computed.canCreateButton).toBe(false);
	});

	it("liveStreamingDetails の Date を ISO 文字列へ変換する", () => {
		const r = fromFirestore(
			doc({
				liveStreamingDetails: {
					scheduledStartTime: new Date("2024-05-05T00:00:00.000Z"),
				} as never,
			}),
		);
		expect(r.liveStreamingDetails?.scheduledStartTime).toBe("2024-05-05T00:00:00.000Z");
	});

	describe("videoType の判定（_computed 経由）", () => {
		it("actualEndTime + 15分超 → archived（ボタン作成可）", () => {
			const r = fromFirestore(
				doc({
					duration: "PT20M",
					liveStreamingDetails: { actualEndTime: PAST } as never,
				}),
			);
			expect(r._computed.videoType).toBe("archived");
			expect(r._computed.isArchived).toBe(true);
			expect(r._computed.canCreateButton).toBe(true);
		});

		it("actualEndTime + 15分以下 → premiere", () => {
			const r = fromFirestore(
				doc({
					duration: "PT5M",
					liveStreamingDetails: { actualEndTime: PAST } as never,
				}),
			);
			expect(r._computed.videoType).toBe("premiere");
			expect(r._computed.isPremiere).toBe(true);
		});

		it("scheduledStartTime が未来 → upcoming", () => {
			const r = fromFirestore(
				doc({ liveStreamingDetails: { scheduledStartTime: FUTURE } as never }),
			);
			expect(r._computed.videoType).toBe("upcoming");
			expect(r._computed.isUpcoming).toBe(true);
		});

		it("scheduledStartTime が過去（未終了）→ live", () => {
			const r = fromFirestore(doc({ liveStreamingDetails: { scheduledStartTime: PAST } as never }));
			expect(r._computed.videoType).toBe("live");
			expect(r._computed.isLive).toBe(true);
		});

		it("liveBroadcastContent が live なら isLive", () => {
			const r = fromFirestore(doc({ liveBroadcastContent: "live" } as never));
			expect(r._computed.isLive).toBe(true);
		});
	});
});

describe("toFirestore", () => {
	const plain = (over: Partial<VideoPlainObject> = {}): VideoPlainObject =>
		({
			videoId: "vid1",
			title: "動画",
			publishedAt: "2024-01-01T00:00:00.000Z",
			lastFetchedAt: "2024-01-02T00:00:00.000Z",
			_computed: { videoType: "normal" },
			...over,
		}) as VideoPlainObject;

	it("ISO 文字列を Date に戻し _computed を除去する", () => {
		const r = toFirestore(plain()) as FirestoreServerVideoData & { _computed?: unknown };
		expect(r.publishedAt).toBeInstanceOf(Date);
		expect((r.publishedAt as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
		expect(r._computed).toBeUndefined();
	});

	it("liveStreamingDetails 無しは undefined", () => {
		const r = toFirestore(plain());
		expect(r.liveStreamingDetails).toBeUndefined();
	});

	it("liveStreamingDetails の文字列を Date に変換し、欠落は undefined", () => {
		const r = toFirestore(
			plain({
				liveStreamingDetails: { scheduledStartTime: "2024-05-05T00:00:00.000Z" } as never,
			}),
		);
		expect(r.liveStreamingDetails?.scheduledStartTime).toBeInstanceOf(Date);
		expect(r.liveStreamingDetails?.actualEndTime).toBeUndefined();
	});

	it("fromFirestore → toFirestore のラウンドトリップで主要値が保たれる", () => {
		const back = toFirestore(fromFirestore(doc()));
		expect(back.videoId).toBe("vid1");
		expect((back.publishedAt as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
	});
});
