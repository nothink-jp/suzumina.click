import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPopularVideoTags, getVideosList, getVideoTitles } from "../actions";

// Mock Firestore
const mockGet = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockCount = vi.fn();

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
			count: mockCount,
		};

		mockCollection.mockReturnValue(mockQuery);
		mockWhere.mockReturnValue(mockQuery);
		mockOrderBy.mockReturnValue(mockQuery);
		mockLimit.mockReturnValue(mockQuery);
		mockStartAfter.mockReturnValue(mockQuery);
		// count() は集計クエリを返す: query.count().get() → { data: () => ({ count }) }
		mockCount.mockReturnValue({
			get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
		});
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
			// デフォルトパスの総数は count() 集計から取得する（SPR-88）
			mockCount.mockReturnValue({
				get: vi.fn().mockResolvedValue({ data: () => ({ count: 2 }) }),
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

		it("フィルタ無しのデフォルトパスは count() 集計で総数を取得する（全件スキャン回避, SPR-88）", async () => {
			mockGet.mockResolvedValue({ docs: [], size: 0 });
			mockCount.mockReturnValue({
				get: vi.fn().mockResolvedValue({ data: () => ({ count: 99 }) }),
			});

			const result = await getVideosList({ page: 1, limit: 12 });

			// count() + where(public) 集計が使われる
			expect(mockWhere).toHaveBeenCalledWith("status.privacyStatus", "==", "public");
			expect(mockCount).toHaveBeenCalled();
			expect(result.totalCount).toBe(99);
		});
	});

	describe("getPopularVideoTags", () => {
		const makeVideoDoc = (id: string, playlistTags: string[]) => ({
			id,
			data: () => ({
				id,
				videoId: id,
				title: `動画 ${id}`,
				description: "説明",
				channelId: "channel-1",
				channelTitle: "チャンネル1",
				publishedAt: new Date("2024-01-01").toISOString(),
				duration: "PT5M",
				thumbnailUrl: "https://example.com/thumb.jpg",
				thumbnails: { high: { url: "https://example.com/thumb.jpg" } },
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
				statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
				// 本番 mapper はネスト tags を正本として書き込む（video-mapper.ts）。
				// filterVideos / getPopularVideoTags はともに video.tags.playlistTags を読む。
				tags: { playlistTags, userTags: [], contentTags: [] },
				playlistTags,
				userTags: [],
				lastFetchedAt: new Date().toISOString(),
			}),
		});

		it("playlistTags を集計し件数の多い順に返す", async () => {
			mockGet.mockResolvedValue({
				docs: [
					makeVideoDoc("v1", ["挨拶", "歌"]),
					makeVideoDoc("v2", ["歌"]),
					makeVideoDoc("v3", ["歌", "ゲーム"]),
				],
			});

			const result = await getPopularVideoTags();

			// public のみ対象とする where 条件で集計
			expect(mockWhere).toHaveBeenCalledWith("status.privacyStatus", "==", "public");
			expect(result[0]).toEqual({ tag: "歌", count: 3 });
			const tags = result.map((t) => t.tag);
			expect(tags).toContain("挨拶");
			expect(tags).toContain("ゲーム");
		});

		it("limit で件数を制限する", async () => {
			mockGet.mockResolvedValue({
				docs: [makeVideoDoc("v1", ["a", "b", "c"])],
			});

			const result = await getPopularVideoTags(2);

			expect(result).toHaveLength(2);
		});

		it("空文字タグは除外する", async () => {
			mockGet.mockResolvedValue({
				docs: [makeVideoDoc("v1", ["", "  ", "有効"])],
			});

			const result = await getPopularVideoTags();

			expect(result).toEqual([{ tag: "有効", count: 1 }]);
		});

		it("エラー時は空配列を返す", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getPopularVideoTags();

			expect(result).toEqual([]);
		});
	});
});
