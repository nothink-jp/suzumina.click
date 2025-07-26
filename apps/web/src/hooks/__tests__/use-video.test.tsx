import { Video, type VideoPlainObject } from "@suzumina.click/shared-types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useVideo } from "../use-video";

// テスト用のVideoPlainObjectを作成するヘルパー
function createMockVideo(overrides?: Partial<any>): VideoPlainObject {
	const defaultData = {
		id: "video123",
		videoId: "abc123",
		title: "テスト動画タイトル",
		description: "テスト動画の説明文です",
		publishedAt: new Date("2024-01-01T00:00:00Z"),
		thumbnailUrl: "https://example.com/thumbnail.jpg",
		lastFetchedAt: new Date("2024-01-01T00:00:00Z"),
		channelId: "channel123",
		channelTitle: "テストチャンネル",
		categoryId: "22",
		duration: "PT10M30S",
		statistics: {
			viewCount: 1000,
			likeCount: 100,
			commentCount: 10,
		},
		liveBroadcastContent: "none",
		liveStreamingDetails: null,
		videoType: "normal",
		playlistTags: ["プレイリストタグ1", "プレイリストタグ2"],
		userTags: ["ユーザータグ1", "ユーザータグ2"],
		audioButtonCount: 0,
	};

	// overridesを適用
	const firestoreData = overrides ? { ...defaultData, ...overrides } : defaultData;

	return Video.fromFirestoreData(firestoreData).toPlainObject();
}

describe("useVideo", () => {
	it("基本的な動画情報を返す", () => {
		const video = createMockVideo();
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.video).toBe(video);
		expect(result.current.youtubeUrl).toBe("https://youtube.com/watch?v=abc123");
		// thumbnailUrlは_computedから取得される
		expect(result.current.thumbnailUrl).toBeTruthy();
	});

	it("日付を正しくフォーマットする", () => {
		const video = createMockVideo();
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.formattedPublishedDate).toBe("2024/01/01");
		expect(result.current.displayDate).toBe("2024/01/01");
		expect(result.current.dateLabel).toBe("公開日");
	});

	it("ライブ配信の場合は配信開始日を優先する", () => {
		const video = createMockVideo({
			videoType: "archived",
			liveStreamingDetails: {
				actualStartTime: "2024-02-15T10:00:00Z",
				actualEndTime: "2024-02-15T12:00:00Z",
			},
		});
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.formattedStreamStartDate).toBe("2024/02/15");
		expect(result.current.displayDate).toBe("2024/02/15");
		expect(result.current.dateLabel).toBe("配信開始");
	});

	it("視聴回数をフォーマットする", () => {
		const video = createMockVideo({
			statistics: {
				viewCount: 123456,
				likeCount: 100,
				commentCount: 10,
			},
		});
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.formattedViewCount).toBe("123,456");
	});

	it("再生時間をフォーマットする", () => {
		const video = createMockVideo({ duration: "PT1H30M45S" });
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.formattedDuration).toBe("1:30:45");
	});

	it("通常動画のバッジ情報を返す", () => {
		const video = createMockVideo({ videoType: "normal" });
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.videoBadgeInfo).toEqual({
			text: "通常動画",
			className: "bg-black/70 text-white",
			ariaLabel: "通常動画コンテンツ",
		});
		expect(result.current.isLiveStream).toBe(false);
		expect(result.current.isArchivedStream).toBe(false);
		expect(result.current.isPremiere).toBe(false);
	});

	it("配信アーカイブのバッジ情報を返す", () => {
		const video = createMockVideo({
			videoType: "archived",
			duration: "PT2H", // 2時間 (15分以上)
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:00:00Z",
			},
		});
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.videoBadgeInfo).toEqual({
			text: "配信アーカイブ",
			className: "bg-gray-600/90 text-white",
			ariaLabel: "ライブ配信のアーカイブ",
		});
		expect(result.current.isArchivedStream).toBe(true);
	});

	it("プレミア公開のバッジ情報を返す", () => {
		const video = createMockVideo({
			videoType: "normal",
			duration: "PT5M", // 5分
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T00:05:00Z",
			},
		});
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.videoBadgeInfo).toEqual({
			text: "プレミア公開",
			className: "bg-purple-600/90 text-white",
			ariaLabel: "プレミア公開動画",
		});
		expect(result.current.isPremiere).toBe(true);
	});

	it("タグ配列を返す", () => {
		const video = createMockVideo();
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.playlistTags).toEqual(["プレイリストタグ1", "プレイリストタグ2"]);
		expect(result.current.userTags).toEqual(["ユーザータグ1", "ユーザータグ2"]);
	});

	it("カテゴリ名を返す", () => {
		const video = createMockVideo({ categoryId: "22" });
		const { result } = renderHook(() => useVideo(video));

		expect(result.current.categoryName).toBe("ブログ・人物");
	});

	it("タグ検索URLを生成する", () => {
		const video = createMockVideo();
		const { result } = renderHook(() => useVideo(video));

		const playlistUrl = result.current.getTagSearchUrl("タグ1", "playlist");
		expect(playlistUrl).toBe(
			"/search?q=%E3%82%BF%E3%82%B01&type=videos&playlistTags=%E3%82%BF%E3%82%B01",
		);

		const userUrl = result.current.getTagSearchUrl("タグ2", "user");
		expect(userUrl).toBe("/search?q=%E3%82%BF%E3%82%B02&type=videos&userTags=%E3%82%BF%E3%82%B02");

		const categoryUrl = result.current.getTagSearchUrl("カテゴリ", "category");
		expect(categoryUrl).toBe(
			"/search?q=%E3%82%AB%E3%83%86%E3%82%B4%E3%83%AA&type=videos&categoryNames=%E3%82%AB%E3%83%86%E3%82%B4%E3%83%AA",
		);
	});
});
