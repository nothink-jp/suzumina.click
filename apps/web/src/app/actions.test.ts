import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getLatestAudioButtons,
	getLatestVideos,
	getLatestWorks,
	searchAudioButtons,
	searchVideos,
	searchWorks,
} from "./actions";

// Server Actionsのモック
vi.mock("./videos/actions", () => ({
	getVideoTitles: vi.fn(),
}));

vi.mock("./works/actions", () => ({
	getWorks: vi.fn(),
}));

vi.mock("./buttons/actions", () => ({
	getRecentAudioButtons: vi.fn(),
	getAudioButtons: vi.fn(),
}));

import { getAudioButtons, getRecentAudioButtons } from "./buttons/actions";
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
					voiceActors: ["涼花みなせ"],
					scenario: [],
					illustration: [],
					music: [],
					design: [],
					otherCreators: {},
					description: "テスト作品の説明",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
					thumbnailUrl: "https://example.com/thumbnail.jpg",
					price: { current: 1100, currency: "JPY" },
					tags: ["テスト"],
					sampleImages: [],
					isExclusive: false,
					userEvaluationCount: 0,
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
					voiceActors: ["涼花みなせ"],
					scenario: [],
					illustration: [],
					music: [],
					design: [],
					otherCreators: {},
					description: "テスト作品2の説明",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ789012.html",
					thumbnailUrl: "https://example.com/thumbnail2.jpg",
					price: { current: 880, currency: "JPY" },
					tags: ["テスト"],
					sampleImages: [],
					isExclusive: false,
					userEvaluationCount: 0,
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

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 10, excludeR18: false });
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

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 10, excludeR18: false });
		});

		it("カスタムlimit値で動作する", async () => {
			const mockResult = {
				works: [],
				hasMore: false,
				totalCount: 0,
			};

			(getWorks as any).mockResolvedValue(mockResult);

			await getLatestWorks(5);

			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 5, excludeR18: false });
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

		it("成功時に正しい結果が返される", async () => {
			const mockWorks = [
				{
					id: "work-1",
					productId: "RJ123456",
					title: "ログテスト作品",
					circle: "テストサークル",
					voiceActors: ["涼花みなせ"],
					scenario: [],
					illustration: [],
					music: [],
					design: [],
					otherCreators: {},
					description: "テスト",
					category: "SOU" as const,
					workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
					thumbnailUrl: "https://example.com/thumbnail.jpg",
					price: { current: 1100, currency: "JPY" },
					tags: [],
					sampleImages: [],
					isExclusive: false,
					userEvaluationCount: 0,
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

			const result = await getLatestWorks(15);

			// ログ出力は削除されたので、結果のみ確認
			expect(result).toEqual(mockWorks);
			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 15, excludeR18: false });
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

		it("成功時に正しい結果が返される", async () => {
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

			const result = await getLatestVideos(20);

			// ログ出力は削除されたので、結果のみ確認
			expect(result).toEqual(mockVideos);
			expect(getVideoTitles).toHaveBeenCalledWith({ page: 1, limit: 20 });
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
					createdBy: "user-1",
					createdByName: "ユーザー1",
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
					createdBy: "user-2",
					createdByName: "ユーザー2",
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

		it("成功時に正しい結果が返される", async () => {
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
					createdBy: "user-log-test",
					createdByName: "ログテストユーザー",
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

			const result = await getLatestAudioButtons(15);

			// ログ出力は削除されたので、結果のみ確認
			expect(result).toEqual(mockAudioButtons);
			expect(getRecentAudioButtons).toHaveBeenCalledWith(15);
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
					voiceActors: ["声優1"],
					scenario: [],
					illustration: [],
					music: [],
					design: [],
					otherCreators: {},
					description: "説明1",
					category: "SOU" as const,
					workUrl: "https://example.com/work1",
					thumbnailUrl: "https://example.com/thumb1.jpg",
					price: { current: 1000, currency: "JPY" },
					tags: [],
					sampleImages: [],
					isExclusive: false,
					userEvaluationCount: 0,
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
					createdBy: "user-1",
					createdByName: "ユーザー1",
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
			expect(getWorks).toHaveBeenCalledWith({ page: 1, limit: 5, excludeR18: false });
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

	describe("Search Functions", () => {
		describe("searchVideos", () => {
			it("正常に動画検索が実行される", async () => {
				const mockVideos = [
					{
						id: "video-search-1",
						videoId: "SearchVideo1",
						title: "涼花みなせ テスト動画",
						description: "涼花みなせさんのテスト動画です",
						channelId: "UC123456789",
						channelTitle: "テストチャンネル",
						publishedAt: "2023-01-01T00:00:00Z",
						thumbnailUrl: "https://img.youtube.com/vi/SearchVideo1/hqdefault.jpg",
						thumbnails: {
							default: {
								url: "https://img.youtube.com/vi/SearchVideo1/default.jpg",
							},
							medium: {
								url: "https://img.youtube.com/vi/SearchVideo1/mqdefault.jpg",
							},
							high: {
								url: "https://img.youtube.com/vi/SearchVideo1/hqdefault.jpg",
							},
						},
						lastFetchedAt: "2023-01-01T00:00:00Z",
						publishedAtISO: "2023-01-01T00:00:00Z",
						lastFetchedAtISO: "2023-01-01T00:00:00Z",
						liveBroadcastContent: "none" as const,
						audioButtonCount: 3,
						hasAudioButtons: true,
					},
					{
						id: "video-search-2",
						videoId: "SearchVideo2",
						title: "涼花みなせ 配信アーカイブ",
						description: "配信のアーカイブ動画",
						channelId: "UC987654321",
						channelTitle: "配信チャンネル",
						publishedAt: "2023-01-02T00:00:00Z",
						thumbnailUrl: "https://img.youtube.com/vi/SearchVideo2/hqdefault.jpg",
						thumbnails: {
							default: {
								url: "https://img.youtube.com/vi/SearchVideo2/default.jpg",
							},
							medium: {
								url: "https://img.youtube.com/vi/SearchVideo2/mqdefault.jpg",
							},
							high: {
								url: "https://img.youtube.com/vi/SearchVideo2/hqdefault.jpg",
							},
						},
						lastFetchedAt: "2023-01-02T00:00:00Z",
						publishedAtISO: "2023-01-02T00:00:00Z",
						lastFetchedAtISO: "2023-01-02T00:00:00Z",
						liveBroadcastContent: "none" as const,
						audioButtonCount: 1,
						hasAudioButtons: true,
					},
				];

				const mockResult = {
					videos: mockVideos,
					hasMore: false,
				};

				(getVideoTitles as any).mockResolvedValue(mockResult);

				const result = await searchVideos("涼花みなせ", 6);

				expect(getVideoTitles).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "涼花みなせ",
					sort: "newest",
				});
				expect(result).toEqual(mockVideos);
				expect(result).toHaveLength(2);
				expect(result[0].title).toContain("涼花みなせ");
			});

			it("デフォルトのlimit値で動作する", async () => {
				const mockResult = {
					videos: [],
					hasMore: false,
				};

				(getVideoTitles as any).mockResolvedValue(mockResult);

				await searchVideos("テスト");

				expect(getVideoTitles).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "テスト",
					sort: "newest",
				});
			});

			it("カスタムlimit値で動作する", async () => {
				const mockResult = {
					videos: [],
					hasMore: false,
				};

				(getVideoTitles as any).mockResolvedValue(mockResult);

				await searchVideos("テスト", 12);

				expect(getVideoTitles).toHaveBeenCalledWith({
					page: 1,
					limit: 12,
					search: "テスト",
					sort: "newest",
				});
			});

			it("検索結果が0件の場合でも正常に動作する", async () => {
				const mockResult = {
					videos: [],
					hasMore: false,
				};

				(getVideoTitles as any).mockResolvedValue(mockResult);

				const result = await searchVideos("存在しない動画");

				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
			});

			it("エラーが発生した場合空配列を返す", async () => {
				const error = new Error("YouTube検索エラー");
				(getVideoTitles as any).mockRejectedValue(error);

				const result = await searchVideos("エラーテスト");

				expect(result).toEqual([]);
				expect(mockConsole.log).toHaveBeenCalledWith(
					expect.stringContaining('"動画検索でエラーが発生"'),
				);
			});

			it("空文字列での検索も処理される", async () => {
				const mockResult = {
					videos: [],
					hasMore: false,
				};

				(getVideoTitles as any).mockResolvedValue(mockResult);

				const result = await searchVideos("", 6);

				expect(getVideoTitles).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "",
					sort: "newest",
				});
				expect(result).toEqual([]);
			});
		});

		describe("searchWorks", () => {
			it("正常に作品検索が実行される", async () => {
				const mockWorks = [
					{
						id: "work-search-1",
						productId: "RJ123456",
						title: "涼花みなせ 声優作品1",
						circle: "テストサークル",
						voiceActors: ["涼花みなせ"],
						scenario: [],
						illustration: [],
						music: [],
						design: [],
						otherCreators: {},
						description: "涼花みなせさんが出演する音声作品",
						category: "SOU" as const,
						workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
						thumbnailUrl: "https://example.com/thumbnail1.jpg",
						price: { current: 1100, currency: "JPY" },
						tags: ["涼花みなせ", "音声作品"],
						sampleImages: [],
						isExclusive: false,
						userEvaluationCount: 0,
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
						id: "work-search-2",
						productId: "RJ789012",
						title: "涼花みなせ ASMR作品",
						circle: "ASMRサークル",
						voiceActors: ["涼花みなせ"],
						scenario: [],
						illustration: [],
						music: [],
						design: [],
						otherCreators: {},
						description: "リラックスできるASMR作品",
						category: "SOU" as const,
						workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ789012.html",
						thumbnailUrl: "https://example.com/thumbnail2.jpg",
						price: { current: 880, currency: "JPY" },
						tags: ["ASMR", "涼花みなせ"],
						sampleImages: [],
						isExclusive: false,
						userEvaluationCount: 0,
						lastFetchedAt: "2023-01-02T00:00:00Z",
						createdAt: "2023-01-02T00:00:00Z",
						updatedAt: "2023-01-02T00:00:00Z",
						displayPrice: "880円",
						relativeUrl: "/maniax/work/=/product_id/RJ789012.html",
						createdAtISO: "2023-01-02T00:00:00Z",
						lastFetchedAtISO: "2023-01-02T00:00:00Z",
						updatedAtISO: "2023-01-02T00:00:00Z",
					},
				];

				const mockResult = {
					works: mockWorks,
					hasMore: true,
					totalCount: 15,
				};

				(getWorks as any).mockResolvedValue(mockResult);

				const result = await searchWorks("涼花みなせ", 6);

				expect(getWorks).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "涼花みなせ",
					sort: "newest",
				});
				expect(result).toEqual(mockWorks);
				expect(result).toHaveLength(2);
				expect(result[0].voiceActors).toContain("涼花みなせ");
			});

			it("デフォルトのlimit値で動作する", async () => {
				const mockResult = {
					works: [],
					hasMore: false,
					totalCount: 0,
				};

				(getWorks as any).mockResolvedValue(mockResult);

				await searchWorks("テスト");

				expect(getWorks).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "テスト",
					sort: "newest",
				});
			});

			it("カスタムlimit値で動作する", async () => {
				const mockResult = {
					works: [],
					hasMore: false,
					totalCount: 0,
				};

				(getWorks as any).mockResolvedValue(mockResult);

				await searchWorks("テスト", 12);

				expect(getWorks).toHaveBeenCalledWith({
					page: 1,
					limit: 12,
					search: "テスト",
					sort: "newest",
				});
			});

			it("検索結果が0件の場合でも正常に動作する", async () => {
				const mockResult = {
					works: [],
					hasMore: false,
					totalCount: 0,
				};

				(getWorks as any).mockResolvedValue(mockResult);

				const result = await searchWorks("存在しない作品");

				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
			});

			it("エラーが発生した場合空配列を返す", async () => {
				const error = new Error("DLsite検索エラー");
				(getWorks as any).mockRejectedValue(error);

				const result = await searchWorks("エラーテスト");

				expect(result).toEqual([]);
				expect(mockConsole.log).toHaveBeenCalledWith(
					expect.stringContaining('"作品検索でエラーが発生"'),
				);
			});

			it("特殊文字を含む検索クエリでも処理される", async () => {
				const mockResult = {
					works: [],
					hasMore: false,
					totalCount: 0,
				};

				(getWorks as any).mockResolvedValue(mockResult);

				const result = await searchWorks("検索&テスト=値+スペース");

				expect(getWorks).toHaveBeenCalledWith({
					page: 1,
					limit: 6,
					search: "検索&テスト=値+スペース",
					sort: "newest",
				});
				expect(result).toEqual([]);
			});
		});

		describe("searchAudioButtons", () => {
			it("正常に音声ボタン検索が実行される", async () => {
				const mockAudioButtons = [
					{
						id: "audio-search-1",
						title: "涼花みなせ 挨拶ボタン",
						description: "涼花みなせさんの挨拶音声",
						category: "voice" as const,
						tags: ["挨拶", "涼花みなせ"],
						sourceVideoId: "search-video-1",
						sourceVideoTitle: "涼花みなせ 配信",
						sourceVideoThumbnailUrl: "https://img.youtube.com/vi/search-video-1/maxresdefault.jpg",
						startTime: 10,
						endTime: 25,
						createdBy: "user-search-1",
						createdByName: "検索ユーザー1",
						isPublic: true,
						playCount: 15,
						likeCount: 5,
						createdAt: "2023-01-01T00:00:00Z",
						updatedAt: "2023-01-01T00:00:00Z",
						durationText: "15秒",
						relativeTimeText: "1日前",
					},
					{
						id: "audio-search-2",
						title: "涼花みなせ 応援ボタン",
						description: "元気な応援メッセージ",
						category: "voice" as const,
						tags: ["応援", "涼花みなせ"],
						sourceVideoId: "search-video-2",
						sourceVideoTitle: "涼花みなせ 雑談",
						sourceVideoThumbnailUrl: "https://img.youtube.com/vi/search-video-2/maxresdefault.jpg",
						startTime: 30,
						endTime: 40,
						createdBy: "user-search-2",
						createdByName: "検索ユーザー2",
						isPublic: true,
						playCount: 25,
						likeCount: 8,
						createdAt: "2023-01-02T00:00:00Z",
						updatedAt: "2023-01-02T00:00:00Z",
						durationText: "10秒",
						relativeTimeText: "2日前",
					},
				];

				const mockResult = {
					success: true,
					data: {
						audioButtons: mockAudioButtons,
						hasMore: true,
					},
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				const params = {
					searchText: "涼花みなせ",
					limit: 6,
					onlyPublic: true,
					sortBy: "newest" as const,
				};

				const result = await searchAudioButtons(params);

				expect(getAudioButtons).toHaveBeenCalledWith(params);
				expect(result.audioButtons).toEqual(mockAudioButtons);
				expect(result.totalCount).toBe(2);
				expect(result.hasMore).toBe(true);
				expect(result.audioButtons).toHaveLength(2);
				expect(result.audioButtons[0].title).toContain("涼花みなせ");
			});

			it("検索条件のパラメータが正しく渡される", async () => {
				const mockResult = {
					success: true,
					data: {
						audioButtons: [],
						hasMore: false,
					},
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				const params = {
					searchText: "テスト検索",
					limit: 12,
					onlyPublic: true,
					sortBy: "popular" as const,
				};

				await searchAudioButtons(params);

				expect(getAudioButtons).toHaveBeenCalledWith({
					searchText: "テスト検索",
					limit: 12,
					onlyPublic: true,
					sortBy: "popular",
				});
			});

			it("検索結果が0件の場合でも正常に動作する", async () => {
				const mockResult = {
					success: true,
					data: {
						audioButtons: [],
						hasMore: false,
					},
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				const params = {
					searchText: "存在しない音声",
					limit: 6,
					onlyPublic: true,
					sortBy: "newest" as const,
				};

				const result = await searchAudioButtons(params);

				expect(result.audioButtons).toEqual([]);
				expect(result.totalCount).toBe(0);
				expect(result.hasMore).toBe(false);
			});

			it("getAudioButtons が失敗した場合のエラーハンドリング", async () => {
				const mockResult = {
					success: false,
					error: "音声ボタン取得エラー",
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				const params = {
					searchText: "エラーテスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "newest" as const,
				};

				const result = await searchAudioButtons(params);

				expect(result.audioButtons).toEqual([]);
				expect(result.totalCount).toBe(0);
				expect(result.hasMore).toBe(false);
			});

			it("例外が発生した場合空の結果を返す", async () => {
				const error = new Error("音声ボタン検索エラー");
				(getAudioButtons as any).mockRejectedValue(error);

				const params = {
					searchText: "例外テスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "newest" as const,
				};

				const result = await searchAudioButtons(params);

				expect(result.audioButtons).toEqual([]);
				expect(result.totalCount).toBe(0);
				expect(result.hasMore).toBe(false);
				expect(mockConsole.log).toHaveBeenCalledWith(
					expect.stringContaining('"音声ボタン検索でエラーが発生"'),
				);
			});

			it("異なるソート順序で検索される", async () => {
				const mockResult = {
					success: true,
					data: {
						audioButtons: [],
						hasMore: false,
					},
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				// 人気順での検索
				await searchAudioButtons({
					searchText: "テスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "popular",
				});

				expect(getAudioButtons).toHaveBeenCalledWith({
					searchText: "テスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "popular",
				});

				// 再生数順での検索
				await searchAudioButtons({
					searchText: "テスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "mostPlayed",
				});

				expect(getAudioButtons).toHaveBeenCalledWith({
					searchText: "テスト",
					limit: 6,
					onlyPublic: true,
					sortBy: "mostPlayed",
				});
			});

			it("非公開ボタンも含む検索が実行される", async () => {
				const mockResult = {
					success: true,
					data: {
						audioButtons: [],
						hasMore: false,
					},
				};

				(getAudioButtons as any).mockResolvedValue(mockResult);

				const params = {
					searchText: "全ボタン検索",
					limit: 6,
					onlyPublic: false, // 非公開も含む
					sortBy: "newest" as const,
				};

				await searchAudioButtons(params);

				expect(getAudioButtons).toHaveBeenCalledWith({
					searchText: "全ボタン検索",
					limit: 6,
					onlyPublic: false,
					sortBy: "newest",
				});
			});
		});
	});
});
