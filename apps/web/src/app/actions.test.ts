import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "./actions";

// Server Actionsのモック
vi.mock("./videos/actions", () => ({
	getVideoTitles: vi.fn(),
}));

vi.mock("./works/actions", () => ({
	getWorks: vi.fn(),
}));

vi.mock("./buttons/actions", () => ({
	getRecentAudioButtons: vi.fn(),
}));

import { getRecentAudioButtons } from "./buttons/actions";
// モックのインポート
import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

// コンソールのモック
const mockConsole = {
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

describe("Homepage Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// console関数をモック
		global.console = {
			...global.console,
			...mockConsole,
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("getLatestWorks", () => {
		it("正常に新着作品を取得できる", async () => {
			const mockWorks = [
				{
					id: "work-1",
					productId: "RJ123456",
					title: "テスト作品1",
					circle: "テストサークル",
					author: ["涼花みなせ"],
					description: "テスト作品の説明",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
					thumbnailUrl: "https://example.com/thumbnail.jpg",
					price: { current: 1100, currency: "JPY" },
					tags: ["テスト"],
					sampleImages: [],
					isExclusive: false,
					lastFetchedAt: "2023-01-01T00:00:00Z",
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					displayPrice: "1,100円",
					relativeUrl: "/maniax/work/=/product_id/RJ123456.html",
					createdAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					updatedAtISO: "2023-01-01T00:00:00Z",
				},
				{
					id: "work-2",
					productId: "RJ789012",
					title: "テスト作品2",
					circle: "テストサークル2",
					author: ["涼花みなせ"],
					description: "テスト作品2の説明",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ789012.html",
					thumbnailUrl: "https://example.com/thumbnail2.jpg",
					price: { current: 880, currency: "JPY" },
					tags: ["テスト"],
					sampleImages: [],
					isExclusive: false,
					lastFetchedAt: "2023-01-01T00:00:00Z",
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					displayPrice: "880円",
					relativeUrl: "/maniax/work/=/product_id/RJ789012.html",
					createdAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					updatedAtISO: "2023-01-01T00:00:00Z",
				},
			];

			const mockResult = {
				works: mockWorks,
				hasMore: false,
				totalCount: 2,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			const result = await getLatestWorks(10);

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 10 });
			expect(result).toEqual(mockWorks);
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe("テスト作品1");
			expect(result[1].title).toBe("テスト作品2");
		});

		it("デフォルトのlimit値で動作する", async () => {
			const mockResult = {
				works: [],
				hasMore: false,
				totalCount: 0,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			await getLatestWorks();

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 10 });
		});

		it("カスタムlimit値で動作する", async () => {
			const mockResult = {
				works: [],
				hasMore: false,
				totalCount: 0,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			await getLatestWorks(5);

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 5 });
		});

		it("作品が0件の場合でも正常に動作する", async () => {
			const mockResult = {
				works: [],
				hasMore: false,
				totalCount: 0,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			const result = await getLatestWorks(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"severity":"WARNING"'));
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"message":"新着作品取得で0件返却"'),
			);
		});

		it("エラーが発生した場合空配列を返す", async () => {
			const error = new Error("データベース接続エラー");
			(getWorks as any).mockRejectedValue(error);

			const result = await getLatestWorks(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"severity":"ERROR"'));
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"message":"新着作品取得でエラーが発生"'),
			);
			// エラー詳細は構造化ログのerrorフィールドに含まれる
		});

		it("非Errorオブジェクトが投げられた場合も適切に処理する", async () => {
			const error = "文字列エラー";
			(getWorks as any).mockRejectedValue(error);

			const result = await getLatestWorks(10);

			expect(result).toEqual([]);
			// エラー詳細は構造化ログに含まれる
		});

		it("成功時に適切なログが出力される", async () => {
			const mockWorks = [
				{
					id: "work-1",
					productId: "RJ123456",
					title: "ログテスト作品",
					circle: "テストサークル",
					author: ["涼花みなせ"],
					description: "テスト",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
					thumbnailUrl: "https://example.com/thumbnail.jpg",
					price: { current: 1100, currency: "JPY" },
					tags: [],
					sampleImages: [],
					isExclusive: false,
					lastFetchedAt: "2023-01-01T00:00:00Z",
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					displayPrice: "1,100円",
					relativeUrl: "/maniax/work/=/product_id/RJ123456.html",
					createdAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					updatedAtISO: "2023-01-01T00:00:00Z",
				},
			];

			const mockResult = {
				works: mockWorks,
				hasMore: true,
				totalCount: 25,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			await getLatestWorks(15);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"新着作品取得を開始"'));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"新着作品取得成功"'));
			// 作品詳細は成功ログに含まれる
		});
	});

	describe("getLatestVideos", () => {
		it("正常に新着動画を取得できる", async () => {
			const mockVideos = [
				{
					id: "video-1",
					videoId: "dQw4w9WgXcQ",
					title: "テスト動画1",
					description: "テスト動画の説明",
					channelId: "UC123456789",
					channelTitle: "テストチャンネル",
					publishedAt: "2023-01-01T00:00:00Z",
					thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
					thumbnails: {
						default: {
							url: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
						},
						medium: {
							url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
						},
						high: {
							url: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
						},
					},
					lastFetchedAt: "2023-01-01T00:00:00Z",
					publishedAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					liveBroadcastContent: "none" as const,
					audioButtonCount: 5,
					hasAudioButtons: true,
				},
				{
					id: "video-2",
					videoId: "AbCdEfGhIjK",
					title: "テスト動画2",
					description: "テスト動画2の説明",
					channelId: "UC987654321",
					channelTitle: "テストチャンネル2",
					publishedAt: "2023-01-02T00:00:00Z",
					thumbnailUrl: "https://img.youtube.com/vi/AbCdEfGhIjK/hqdefault.jpg",
					thumbnails: {
						default: {
							url: "https://img.youtube.com/vi/AbCdEfGhIjK/default.jpg",
						},
						medium: {
							url: "https://img.youtube.com/vi/AbCdEfGhIjK/mqdefault.jpg",
						},
						high: {
							url: "https://img.youtube.com/vi/AbCdEfGhIjK/hqdefault.jpg",
						},
					},
					lastFetchedAt: "2023-01-02T00:00:00Z",
					publishedAtISO: "2023-01-02T00:00:00Z",
					lastFetchedAtISO: "2023-01-02T00:00:00Z",
					liveBroadcastContent: "none" as const,
					audioButtonCount: 3,
					hasAudioButtons: true,
				},
			];

			const mockResult = {
				videos: mockVideos,
				hasMore: false,
			};

			(getVideoTitles as any).mockResolvedValue(mockResult);

			const result = await getLatestVideos(10);

			expect(getVideoTitles).toHaveBeenCalledWith({ page: 1, limit: 10 });
			expect(result).toEqual(mockVideos);
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe("テスト動画1");
			expect(result[1].title).toBe("テスト動画2");
		});

		it("デフォルトのlimit値で動作する", async () => {
			const mockResult = {
				videos: [],
				hasMore: false,
			};

			(getVideoTitles as any).mockResolvedValue(mockResult);

			await getLatestVideos();

			expect(getVideoTitles).toHaveBeenCalledWith({ page: 1, limit: 10 });
		});

		it("カスタムlimit値で動作する", async () => {
			const mockResult = {
				videos: [],
				hasMore: false,
			};

			(getVideoTitles as any).mockResolvedValue(mockResult);

			await getLatestVideos(8);

			expect(getVideoTitles).toHaveBeenCalledWith({ page: 1, limit: 8 });
		});

		it("動画が0件の場合でも正常に動作する", async () => {
			const mockResult = {
				videos: [],
				hasMore: false,
			};

			(getVideoTitles as any).mockResolvedValue(mockResult);

			const result = await getLatestVideos(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着動画取得で0件返却"'),
			);
		});

		it("エラーが発生した場合空配列を返す", async () => {
			const error = new Error("YouTube API エラー");
			(getVideoTitles as any).mockRejectedValue(error);

			const result = await getLatestVideos(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着動画取得でエラーが発生"'),
			);
			// エラー詳細は構造化ログに含まれる
		});

		it("非Errorオブジェクトが投げられた場合も適切に処理する", async () => {
			const error = { code: 404, message: "Not Found" };
			(getVideoTitles as any).mockRejectedValue(error);

			const result = await getLatestVideos(10);

			expect(result).toEqual([]);
			// エラー詳細は構造化ログに含まれる
		});

		it("成功時に適切なログが出力される", async () => {
			const mockVideos = [
				{
					id: "video-1",
					videoId: "LogTestVideo",
					title: "ログテスト動画",
					description: "テスト",
					channelId: "UC123456789",
					channelTitle: "テストチャンネル",
					publishedAt: "2023-01-01T00:00:00Z",
					thumbnailUrl: "https://img.youtube.com/vi/LogTestVideo/hqdefault.jpg",
					thumbnails: {
						default: {
							url: "https://img.youtube.com/vi/LogTestVideo/default.jpg",
						},
						medium: {
							url: "https://img.youtube.com/vi/LogTestVideo/mqdefault.jpg",
						},
						high: {
							url: "https://img.youtube.com/vi/LogTestVideo/hqdefault.jpg",
						},
					},
					lastFetchedAt: "2023-01-01T00:00:00Z",
					publishedAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					liveBroadcastContent: "none" as const,
					audioButtonCount: 0,
					hasAudioButtons: false,
				},
			];

			const mockResult = {
				videos: mockVideos,
				hasMore: true,
			};

			(getVideoTitles as any).mockResolvedValue(mockResult);

			await getLatestVideos(20);

			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"新着動画取得を開始"'));
			expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"新着動画取得成功"'));
			// 動画詳細は成功ログに含まれる
		});
	});

	describe("getLatestAudioButtons", () => {
		it("正常に新着音声ボタンを取得できる", async () => {
			const mockAudioButtons = [
				{
					id: "audio-1",
					title: "テスト音声ボタン1",
					description: "テスト用の音声ボタン",
					category: "voice" as const,
					tags: ["テスト"],
					sourceVideoId: "video-1",
					sourceVideoTitle: "テスト動画1",
					sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-1/maxresdefault.jpg",
					startTime: 10,
					endTime: 20,
					uploadedBy: "user-1",
					uploadedByName: "ユーザー1",
					isPublic: true,
					playCount: 5,
					likeCount: 2,
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					durationText: "10秒",
					relativeTimeText: "1日前",
				},
				{
					id: "audio-2",
					title: "テスト音声ボタン2",
					description: "テスト用の音声ボタン2",
					category: "bgm" as const,
					tags: ["音楽"],
					sourceVideoId: "video-2",
					sourceVideoTitle: "テスト動画2",
					sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-2/maxresdefault.jpg",
					startTime: 30,
					endTime: 45,
					uploadedBy: "user-2",
					uploadedByName: "ユーザー2",
					isPublic: true,
					playCount: 8,
					likeCount: 3,
					createdAt: "2023-01-02T00:00:00Z",
					updatedAt: "2023-01-02T00:00:00Z",
					durationText: "15秒",
					relativeTimeText: "2日前",
				},
			];

			(getRecentAudioButtons as any).mockResolvedValue(mockAudioButtons);

			const result = await getLatestAudioButtons(10);

			expect(getRecentAudioButtons).toHaveBeenCalledWith(10);
			expect(result).toEqual(mockAudioButtons);
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe("テスト音声ボタン1");
			expect(result[1].title).toBe("テスト音声ボタン2");
		});

		it("デフォルトのlimit値で動作する", async () => {
			(getRecentAudioButtons as any).mockResolvedValue([]);

			await getLatestAudioButtons();

			expect(getRecentAudioButtons).toHaveBeenCalledWith(10);
		});

		it("カスタムlimit値で動作する", async () => {
			(getRecentAudioButtons as any).mockResolvedValue([]);

			await getLatestAudioButtons(5);

			expect(getRecentAudioButtons).toHaveBeenCalledWith(5);
		});

		it("音声ボタンが0件の場合でも正常に動作する", async () => {
			(getRecentAudioButtons as any).mockResolvedValue([]);

			const result = await getLatestAudioButtons(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着音声ボタン取得で0件返却"'),
			);
		});

		it("エラーが発生した場合空配列を返す", async () => {
			const error = new Error("Firestore エラー");
			(getRecentAudioButtons as any).mockRejectedValue(error);

			const result = await getLatestAudioButtons(10);

			expect(result).toEqual([]);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着音声ボタン取得でエラーが発生"'),
			);
		});

		it("成功時に適切なログが出力される", async () => {
			const mockAudioButtons = [
				{
					id: "audio-log-test",
					title: "ログテスト音声ボタン",
					description: "テスト",
					category: "voice" as const,
					tags: [],
					sourceVideoId: "video-log-test",
					sourceVideoTitle: "ログテスト動画",
					sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-log-test/maxresdefault.jpg",
					startTime: 0,
					endTime: 5,
					uploadedBy: "user-log-test",
					uploadedByName: "ログテストユーザー",
					isPublic: true,
					playCount: 0,
					likeCount: 0,
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					durationText: "5秒",
					relativeTimeText: "今",
				},
			];

			(getRecentAudioButtons as any).mockResolvedValue(mockAudioButtons);

			await getLatestAudioButtons(15);

			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着音声ボタン取得を開始"'),
			);
			expect(mockConsole.log).toHaveBeenCalledWith(
				expect.stringContaining('"新着音声ボタン取得成功"'),
			);
		});
	});

	describe("統合テスト", () => {
		it("全データ取得関数が独立して動作する", async () => {
			const mockWorks = [
				{
					id: "work-1",
					productId: "RJ123456",
					title: "作品1",
					circle: "サークル1",
					author: ["声優1"],
					description: "説明1",
					category: "SOU" as const,
					workUrl: "https://example.com/work1",
					thumbnailUrl: "https://example.com/thumb1.jpg",
					price: { current: 1000, currency: "JPY" },
					tags: [],
					sampleImages: [],
					isExclusive: false,
					lastFetchedAt: "2023-01-01T00:00:00Z",
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					displayPrice: "1,000円",
					relativeUrl: "/work1",
					createdAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					updatedAtISO: "2023-01-01T00:00:00Z",
				},
			];

			const mockVideos = [
				{
					id: "video-1",
					videoId: "TestVideo123",
					title: "動画1",
					description: "動画説明1",
					channelId: "UC123",
					channelTitle: "チャンネル1",
					publishedAt: "2023-01-01T00:00:00Z",
					thumbnailUrl: "https://example.com/video1.jpg",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
						medium: { url: "https://example.com/medium.jpg" },
						high: { url: "https://example.com/high.jpg" },
					},
					lastFetchedAt: "2023-01-01T00:00:00Z",
					publishedAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					liveBroadcastContent: "none" as const,
					audioButtonCount: 0,
					hasAudioButtons: false,
				},
			];

			(getWorks as any).mockResolvedValue({
				works: mockWorks,
				hasMore: false,
				totalCount: 1,
			});

			(getVideoTitles as any).mockResolvedValue({
				videos: mockVideos,
				hasMore: false,
			});

			const mockAudioButtons = [
				{
					id: "audio-1",
					title: "音声1",
					description: "音声説明1",
					category: "voice" as const,
					tags: [],
					sourceVideoId: "TestVideo123",
					sourceVideoTitle: "動画1",
					sourceVideoThumbnailUrl: "https://img.youtube.com/vi/TestVideo123/maxresdefault.jpg",
					startTime: 0,
					endTime: 5,
					uploadedBy: "user-1",
					uploadedByName: "ユーザー1",
					isPublic: true,
					playCount: 0,
					likeCount: 0,
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					durationText: "5秒",
					relativeTimeText: "今",
				},
			];

			(getRecentAudioButtons as any).mockResolvedValue(mockAudioButtons);

			const [worksResult, videosResult, audioButtonsResult] = await Promise.all([
				getLatestWorks(5),
				getLatestVideos(5),
				getLatestAudioButtons(5),
			]);

			expect(worksResult).toEqual(mockWorks);
			expect(videosResult).toEqual(mockVideos);
			expect(audioButtonsResult).toEqual(mockAudioButtons);
			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 5 });
			expect(getVideoTitles).toHaveBeenCalledWith({ page: 1, limit: 5 });
			expect(getRecentAudioButtons).toHaveBeenCalledWith(5);
		});

		it("一方がエラーでももう一方は正常に動作する", async () => {
			const mockVideos = [
				{
					id: "video-1",
					videoId: "WorkingVideo",
					title: "正常動画",
					description: "正常に取得された動画",
					channelId: "UC123",
					channelTitle: "チャンネル",
					publishedAt: "2023-01-01T00:00:00Z",
					thumbnailUrl: "https://example.com/video.jpg",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
						medium: { url: "https://example.com/medium.jpg" },
						high: { url: "https://example.com/high.jpg" },
					},
					lastFetchedAt: "2023-01-01T00:00:00Z",
					publishedAtISO: "2023-01-01T00:00:00Z",
					lastFetchedAtISO: "2023-01-01T00:00:00Z",
					liveBroadcastContent: "none" as const,
					audioButtonCount: 0,
					hasAudioButtons: false,
				},
			];

			(getWorks as any).mockRejectedValue(new Error("作品取得エラー"));
			(getVideoTitles as any).mockResolvedValue({
				videos: mockVideos,
				hasMore: false,
			});

			const [worksResult, videosResult] = await Promise.all([
				getLatestWorks(5),
				getLatestVideos(5),
			]);

			expect(worksResult).toEqual([]); // エラー時は空配列
			expect(videosResult).toEqual(mockVideos); // 正常に取得
		});
	});
});
