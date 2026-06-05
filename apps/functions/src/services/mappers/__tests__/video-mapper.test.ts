import type { youtube_v3 } from "googleapis";
import { describe, expect, it, vi } from "vitest";
import {
	mapYouTubeToVideoPlainObject,
	mapYouTubeVideosWithErrors,
	VideoMapper,
} from "../video-mapper";

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

const ytVideo = (overrides: Partial<youtube_v3.Schema$Video> = {}): youtube_v3.Schema$Video => {
	const { snippet, contentDetails, statistics, ...rest } = overrides;
	return {
		id: "vid123",
		...rest,
		// ネストオブジェクトは個別に深いマージする（rest 展開で上書きされないよう後置）
		snippet: {
			title: "テスト動画",
			description: "説明",
			channelId: "UCxxxx",
			channelTitle: "チャンネル",
			publishedAt: "2024-01-01T00:00:00Z",
			tags: ["t1", "t2"],
			thumbnails: { high: { url: "https://i/h.jpg" } },
			liveBroadcastContent: "none",
			...snippet,
		},
		contentDetails: { duration: "PT3M45S", ...contentDetails },
		// statistics は「キーを明示指定したら（undefined 含め）その値」を優先する
		statistics:
			"statistics" in overrides
				? statistics
				: { viewCount: "1000", likeCount: "10", commentCount: "5" },
	};
};

describe("mapYouTubeToVideoPlainObject", () => {
	it("id または snippet が無ければ null", () => {
		expect(mapYouTubeToVideoPlainObject({ snippet: {} } as youtube_v3.Schema$Video)).toBeNull();
		expect(mapYouTubeToVideoPlainObject({ id: "x" } as youtube_v3.Schema$Video)).toBeNull();
	});

	it("通常動画の主要フィールドを写像する", () => {
		const v = mapYouTubeToVideoPlainObject(ytVideo(), ["pl"], ["user"]);
		expect(v?.videoId).toBe("vid123");
		expect(v?.title).toBe("テスト動画");
		expect(v?.statistics?.viewCount).toBe(1000);
		expect(v?.thumbnailUrl).toBe("https://i/h.jpg");
		expect(v?._computed?.youtubeUrl).toBe("https://youtube.com/watch?v=vid123");
		expect(v?.tags).toEqual({
			playlistTags: ["pl"],
			userTags: ["user"],
			contentTags: ["t1", "t2"],
		});
		expect(v?.videoType).toBe("normal");
		// 許諾上ボタン作成可は archived のみ。normal は hasAudioButtons / canCreateButton とも false で整合する。
		expect(v?.hasAudioButtons).toBe(false);
		expect(v?._computed?.canCreateButton).toBe(false);
	});

	it("statistics 無しは undefined", () => {
		const v = mapYouTubeToVideoPlainObject(ytVideo({ statistics: undefined }));
		expect(v?.statistics).toBeUndefined();
	});

	it("snippet の欠落フィールドは既定値（空文字 / 空サムネ）で補完する", () => {
		// 必須 id + 最小 snippet（title 等を持たない）でフォールバック分岐を通す
		const v = mapYouTubeToVideoPlainObject({
			id: "min1",
			snippet: { channelId: "c1" },
		} as youtube_v3.Schema$Video);
		expect(v?.title).toBe("");
		expect(v?.description).toBe("");
		expect(v?.channelTitle).toBe("");
		expect(v?.categoryId).toBe("");
		expect(v?.duration).toBe("");
		expect(v?.thumbnailUrl).toBe("");
		expect(v?.liveBroadcastContent).toBe("none");
		expect(v?.tags?.contentTags).toEqual([]);
	});

	describe("determineVideoType", () => {
		const typeOf = (o: Partial<youtube_v3.Schema$Video>) =>
			mapYouTubeToVideoPlainObject(ytVideo(o))?.videoType;

		it("#shorts をタイトル/説明に含むと short", () => {
			expect(typeOf({ snippet: { title: "曲 #shorts" } })).toBe("short");
			expect(typeOf({ snippet: { title: "x", description: "#shorts" } })).toBe("short");
		});

		it("60秒未満は short", () => {
			expect(typeOf({ contentDetails: { duration: "PT30S" } })).toBe("short");
		});

		it("配信中（actualStartTime あり・未終了）は live", () => {
			expect(typeOf({ liveStreamingDetails: { actualStartTime: "2024-01-01T00:00:00Z" } })).toBe(
				"live",
			);
		});

		it("配信予定（scheduledStartTime のみ）は upcoming", () => {
			expect(typeOf({ liveStreamingDetails: { scheduledStartTime: "2099-01-01T00:00:00Z" } })).toBe(
				"upcoming",
			);
		});

		it("liveStreamingDetails あり・開始終了情報なしは premiere", () => {
			expect(typeOf({ liveStreamingDetails: {} })).toBe("premiere");
		});

		it("終了済み・15分超は archived、15分以下は premiere", () => {
			expect(
				typeOf({
					contentDetails: { duration: "PT20M" },
					liveStreamingDetails: { actualEndTime: "2024-01-01T01:00:00Z" },
				}),
			).toBe("archived");
			expect(
				typeOf({
					contentDetails: { duration: "PT5M" },
					liveStreamingDetails: { actualEndTime: "2024-01-01T01:00:00Z" },
				}),
			).toBe("premiere");
		});
	});

	it("archived はボタン作成可・_computed フラグが整合する", () => {
		const v = mapYouTubeToVideoPlainObject(
			ytVideo({
				contentDetails: { duration: "PT20M" },
				liveStreamingDetails: { actualEndTime: "2024-01-01T01:00:00Z" },
			}),
		);
		expect(v?._computed?.isArchived).toBe(true);
		expect(v?._computed?.canCreateButton).toBe(true);
		expect(v?.hasAudioButtons).toBe(true);
	});

	it("liveStreamingDetails の concurrentViewers(文字列)を数値化する", () => {
		const v = mapYouTubeToVideoPlainObject(
			ytVideo({
				liveStreamingDetails: {
					actualStartTime: "2024-01-01T00:00:00Z",
					concurrentViewers: "42",
				},
			}),
		);
		expect(v?.liveStreamingDetails?.concurrentViewers).toBe(42);
	});

	describe("getBestThumbnail（thumbnailUrl 経由）", () => {
		const thumbUrl = (thumbnails: youtube_v3.Schema$ThumbnailDetails) =>
			mapYouTubeToVideoPlainObject(ytVideo({ snippet: { thumbnails } }))?.thumbnailUrl;

		it("maxres > standard > high > medium > default の優先順", () => {
			expect(thumbUrl({ maxres: { url: "max" }, high: { url: "high" } })).toBe("max");
			expect(thumbUrl({ standard: { url: "std" }, high: { url: "high" } })).toBe("std");
			expect(thumbUrl({ medium: { url: "med" }, default: { url: "def" } })).toBe("med");
			expect(thumbUrl({ default: { url: "def" } })).toBe("def");
		});

		it("サムネイル無しは空文字", () => {
			expect(thumbUrl({})).toBe("");
		});
	});
});

describe("mapYouTubeVideosWithErrors", () => {
	it("id 欠落・snippet 欠落をエラーとして収集する", () => {
		const result = mapYouTubeVideosWithErrors([
			{} as youtube_v3.Schema$Video, // id 欠落
			{ id: "noSnippet" } as youtube_v3.Schema$Video, // snippet 欠落
			ytVideo({ id: "ok1" }),
		]);
		expect(result.totalProcessed).toBe(3);
		expect(result.successCount).toBe(1);
		expect(result.failureCount).toBe(2);
		expect(result.errors.map((e) => e.field).sort()).toEqual(["id", "snippet"]);
		expect(result.videos[0]?.videoId).toBe("ok1");
	});

	it("playlistTags / userTags マップを引き当てる", () => {
		const result = mapYouTubeVideosWithErrors(
			[ytVideo({ id: "v1" })],
			new Map([["v1", ["pl"]]]),
			new Map([["v1", ["ut"]]]),
		);
		expect(result.videos[0]?.tags?.playlistTags).toEqual(["pl"]);
		expect(result.videos[0]?.tags?.userTags).toEqual(["ut"]);
	});
});

describe("VideoMapper（互換 API）", () => {
	it("fromYouTubeAPI / fromYouTubeAPIWithTags", () => {
		expect(VideoMapper.fromYouTubeAPI(ytVideo())?.videoId).toBe("vid123");
		expect(VideoMapper.fromYouTubeAPIWithTags(ytVideo(), ["p"], ["u"])?.tags?.playlistTags).toEqual(
			["p"],
		);
	});
});
