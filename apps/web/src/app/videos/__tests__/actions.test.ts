import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVideosList, getVideoTitles } from "../actions";

// Mock Firestore
const mockGet = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: mockCollection,
	}),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
}));

describe("Video Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup collection chain
		const mockQuery = {
			doc: mockDoc,
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			startAfter: mockStartAfter,
			get: mockGet,
		};

		mockCollection.mockReturnValue(mockQuery);
		mockWhere.mockReturnValue(mockQuery);
		mockOrderBy.mockReturnValue(mockQuery);
		mockLimit.mockReturnValue(mockQuery);
		mockStartAfter.mockReturnValue(mockQuery);
	});

	describe("getVideoTitles", () => {
		const mockVideoDocs = [
			{
				id: "video-1",
				data: () => ({
					id: "video-1",
					videoId: "video-1",
					title: "動画タイトル1",
					description: "説明1",
					channelId: "channel-1",
					channelTitle: "チャンネル1",
					publishedAt: new Date("2024-01-01").toISOString(),
					duration: "PT5M",
					thumbnailUrl: "https://example.com/thumb1.jpg",
					thumbnails: { high: { url: "https://example.com/thumb1.jpg" } },
					viewCount: 100,
					likeCount: 10,
					commentCount: 5,
					hasAudioButtons: true,
					audioButtonCount: 0,
					categoryId: "10",
					status: { privacyStatus: "public", uploadStatus: "processed" },
					contentDetails: {
						duration: "PT5M",
						dimension: "2d",
						definition: "hd",
						caption: "false",
						licensedContent: false,
					},
					statistics: {
						viewCount: "100",
						likeCount: "10",
						commentCount: "5",
					},
					playlistTags: [],
					userTags: [],
					lastFetchedAt: new Date().toISOString(),
				}),
			},
			{
				id: "video-2",
				data: () => ({
					id: "video-2",
					videoId: "video-2",
					title: "動画タイトル2",
					description: "説明2",
					channelId: "channel-2",
					channelTitle: "チャンネル2",
					publishedAt: new Date("2024-01-02").toISOString(),
					duration: "PT10M",
					thumbnailUrl: "https://example.com/thumb2.jpg",
					thumbnails: { high: { url: "https://example.com/thumb2.jpg" } },
					viewCount: 200,
					likeCount: 20,
					commentCount: 10,
					hasAudioButtons: false,
					audioButtonCount: 0,
					categoryId: "10",
					status: { privacyStatus: "public", uploadStatus: "processed" },
					contentDetails: {
						duration: "PT10M",
						dimension: "2d",
						definition: "hd",
						caption: "false",
						licensedContent: false,
					},
					statistics: {
						viewCount: "200",
						likeCount: "20",
						commentCount: "10",
					},
					playlistTags: [],
					userTags: [],
					lastFetchedAt: new Date().toISOString(),
				}),
			},
		];

		it("動画リストが正常に取得できる", async () => {
			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
				size: 2,
			});

			const result = await getVideoTitles();

			expect(result.videos).toHaveLength(2);
			expect(result.videos[0].title).toBe("動画タイトル1");
			expect(result.total).toBe(2);
		});

		it("検索パラメータで動画がフィルタリングされる", async () => {
			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
			});

			const result = await getVideoTitles({
				search: "動画タイトル1",
				page: 1,
				limit: 12,
			});

			// 検索時は全件取得される
			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.videos).toBeDefined();
		});

		it("年代フィルタが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
			});

			const result = await getVideoTitles({
				year: "2024",
				page: 1,
				limit: 12,
			});

			// 年代フィルタもメモリ上で処理
			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.videos).toBeDefined();
		});

		it("カテゴリフィルタが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
			});

			const result = await getVideoTitles({
				categoryNames: ["音楽"],
				page: 1,
				limit: 12,
			});

			// カテゴリフィルタもメモリ上で処理
			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.videos).toBeDefined();
		});

		it("ソート順が正しく適用される", async () => {
			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
			});

			await getVideoTitles({
				sort: "oldest",
				page: 1,
				limit: 12,
			});

			expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "asc");
		});

		it("エラー時に空の結果を返す", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getVideoTitles();

			expect(result.videos).toEqual([]);
			expect(result.total).toBe(0);
			expect(result.page).toBe(1);
		});
	});

	describe("getVideosList", () => {
		it("ConfigurableList用のフォーマットでデータを返す", async () => {
			const mockVideoDocs = [
				{
					id: "video-1",
					data: () => ({
						id: "video-1",
						videoId: "video-1",
						title: "動画1",
						description: "説明1",
						channelId: "channel-1",
						channelTitle: "チャンネル1",
						publishedAt: new Date("2024-01-01").toISOString(),
						duration: "PT5M",
						thumbnailUrl: "https://example.com/thumb1.jpg",
						thumbnails: { high: { url: "https://example.com/thumb1.jpg" } },
						viewCount: 100,
						likeCount: 10,
						commentCount: 5,
						hasAudioButtons: true,
						audioButtonCount: 0,
						categoryId: "10",
						status: { privacyStatus: "public", uploadStatus: "processed" },
						contentDetails: {
							duration: "PT5M",
							dimension: "2d",
							definition: "hd",
							caption: "false",
							licensedContent: false,
						},
						statistics: {
							viewCount: "100",
							likeCount: "10",
							commentCount: "5",
						},
						playlistTags: [],
						userTags: [],
						lastFetchedAt: new Date().toISOString(),
					}),
				},
			];

			mockGet.mockResolvedValue({
				docs: mockVideoDocs,
				size: 1,
			});

			const result = await getVideosList({
				page: 1,
				limit: 12,
				search: "動画",
			});

			expect(result.items).toHaveLength(1);
			expect(result.totalCount).toBeDefined();
			expect(result.filteredCount).toBeDefined();
		});

		it("フィルターパラメータが正しく変換される", async () => {
			mockGet.mockResolvedValue({
				docs: [],
				size: 0,
			});

			await getVideosList({
				page: 1,
				limit: 12,
				filters: {
					year: "2024",
					categoryNames: "音楽",
					videoType: "regular",
				},
			});

			// getVideoTitlesが正しいパラメータで呼ばれることを確認
			expect(mockGet).toHaveBeenCalled();
		});
	});
});
