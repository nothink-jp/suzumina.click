import { describe, expect, it } from "vitest";
import {
	determineVideoType,
	isLiveVideoType,
	type VideoTypeSource,
} from "../operations/video-type";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const PAST = "2025-12-31T23:00:00.000Z";
const FUTURE = "2026-01-02T00:00:00.000Z";

const typeOf = (v: VideoTypeSource) => determineVideoType(v, NOW);

describe("determineVideoType（動画タイプ判定の正本）", () => {
	describe("配信情報あり", () => {
		it("終了済み・15 分超は archived、15 分以下は premiere", () => {
			expect(typeOf({ duration: "PT15M1S", liveStreamingDetails: { actualEndTime: PAST } })).toBe(
				"archived",
			);
			expect(typeOf({ duration: "PT15M", liveStreamingDetails: { actualEndTime: PAST } })).toBe(
				"premiere",
			);
		});

		it("開始済み・未終了は live", () => {
			expect(
				typeOf({ liveStreamingDetails: { actualStartTime: PAST, scheduledStartTime: PAST } }),
			).toBe("live");
		});

		it("予定時刻が未来なら upcoming、過去で未開始なら possibly_live", () => {
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: FUTURE } })).toBe("upcoming");
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: PAST } })).toBe("possibly_live");
		});

		it("予定時刻から 24 時間以上経っても未開始なら upcoming に戻す（SPR-404）", () => {
			const hoursBefore = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: hoursBefore(23.99) } })).toBe(
				"possibly_live",
			);
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: hoursBefore(24) } })).toBe(
				"upcoming",
			);
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: hoursBefore(24 * 30) } })).toBe(
				"upcoming",
			);
		});

		it("時刻は string / Date / Firestore Timestamp を受け付ける", () => {
			const ts = { toDate: () => new Date(PAST) };
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: new Date(FUTURE) } })).toBe(
				"upcoming",
			);
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: ts } })).toBe("possibly_live");
			expect(typeOf({ duration: "PT1H", liveStreamingDetails: { actualEndTime: ts } })).toBe(
				"archived",
			);
		});

		it("配信情報は #shorts や短さより優先する", () => {
			expect(
				typeOf({
					title: "配信 #shorts",
					duration: "PT2H",
					liveStreamingDetails: { actualEndTime: PAST },
				}),
			).toBe("archived");
		});

		it("時刻情報が 1 つもなければ配信扱いしない", () => {
			expect(typeOf({ duration: "PT10M", liveStreamingDetails: {} })).toBe("normal");
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: "invalid" } })).toBe("normal");
		});
	});

	describe("配信情報なし", () => {
		it("タイトルか説明に #shorts を含むと short", () => {
			expect(typeOf({ title: "曲 #shorts", duration: "PT3M" })).toBe("short");
			expect(typeOf({ description: "#shorts", duration: "PT3M" })).toBe("short");
		});

		it("60 秒未満は short、長さ不明（0 秒）は normal", () => {
			expect(typeOf({ duration: "PT59S" })).toBe("short");
			expect(typeOf({ duration: "PT1M" })).toBe("normal");
			expect(typeOf({ duration: "P0D" })).toBe("normal");
			expect(typeOf({})).toBe("normal");
		});
	});
});

describe("isLiveVideoType", () => {
	it("live と possibly_live だけが配信中", () => {
		expect(isLiveVideoType("live")).toBe(true);
		expect(isLiveVideoType("possibly_live")).toBe(true);
		expect(isLiveVideoType("upcoming")).toBe(false);
		expect(isLiveVideoType("archived")).toBe(false);
	});
});
