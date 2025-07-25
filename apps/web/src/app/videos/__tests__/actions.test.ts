import { Timestamp } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { getTotalVideoCount, getVideoById, getVideoTitles } from "../actions";

// Firestoreライブラリのモック
vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(),
}));

// shared-typesのモック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToFrontendVideo: vi.fn(),
}));

import { convertToFrontendVideo } from "@suzumina.click/shared-types";
// モックのインポート
import { getFirestore } from "@/lib/firestore";

// コンソールのモック
const mockConsole = {
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// Firestoreモックヘルパー
const createMockFirestore = () => {
	const mockDoc = {
		get: vi.fn(),
		data: vi.fn(),
		id: "test-video-1",
		exists: true,
	};

	const mockCollection = {
		doc: vi.fn().mockReturnValue(mockDoc),
		orderBy: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		startAfter: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		get: vi.fn(),
	};

	const mockFirestore = {
		collection: vi.fn().mockReturnValue(mockCollection),
	};

	return { mockFirestore, mockCollection, mockDoc };
};

// テスト用データ
const createMockVideoData = (overrides = {}) => ({
	videoId: "dQw4w9WgXcQ",
	title: "Test Video Title",
	description: "Test video description",
	channelId: "UC123456789",
	channelTitle: "Test Channel",
	publishedAt: Timestamp.fromDate(new Date("2023-01-01T12:00:00Z")),
	thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	lastFetchedAt: Timestamp.fromDate(new Date("2023-01-02T12:00:00Z")),
	videoType: "all",
	liveBroadcastContent: "none",
	audioButtonCount: 5,
	hasAudioButtons: true,
	...overrides,
});

const createMockFrontendVideo = (overrides = {}) => ({
	id: "test-video-1",
	videoId: "dQw4w9WgXcQ",
	title: "Test Video Title",
	description: "Test video description",
	channelId: "UC123456789",
	channelTitle: "Test Channel",
	publishedAt: "2023-01-01T12:00:00.000Z",
	thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	thumbnails: {
		default: { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg" },
		medium: { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
		high: { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
	},
	lastFetchedAt: "2023-01-02T12:00:00.000Z",
	publishedAtISO: "2023-01-01T12:00:00.000Z",
	lastFetchedAtISO: "2023-01-02T12:00:00.000Z",
	liveBroadcastContent: "none" as const,
	audioButtonCount: 5,
	hasAudioButtons: true,
	...overrides,
});

describe("Videos Actions", () => {
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

	describe("getVideoTitles", () => {
		it("正常に動画一覧を取得できる", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockDocs = [
				{
					id: "video-1",
					data: () => createMockVideoData({ title: "Video 1" }),
				},
				{
					id: "video-2",
					data: () =>
						createMockVideoData({
							title: "Video 2",
							videoId: "AbCdEfGhIjK",
						}),
				},
			];

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: mockDocs,
			});

			const mockFrontendVideos = [
				createMockFrontendVideo({ id: "video-1", title: "Video 1" }),
				createMockFrontendVideo({
					id: "video-2",
					title: "Video 2",
					videoId: "AbCdEfGhIjK",
				}),
			];

			(convertToFrontendVideo as Mock)
				.mockReturnValueOnce(mockFrontendVideos[0])
				.mockReturnValueOnce(mockFrontendVideos[1]);

			const result = await getVideoTitles({ page: 1, limit: 12 });

			expect(result.videos).toHaveLength(2);
			expect(result.hasMore).toBe(false);
			expect(result.videos[0].title).toBe("Video 1");
			expect(result.videos[1].title).toBe("Video 2");
			expect(mockCollection.orderBy).toHaveBeenCalledWith("publishedAt", "desc");
			expect(mockCollection.limit).toHaveBeenCalledWith(13); // limit + 1
		});

		it("デフォルトパラメータで動作する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				empty: true,
				docs: [],
			});

			const result = await getVideoTitles();

			expect(result.videos).toEqual([]);
			expect(result.hasMore).toBe(false);
			expect(mockCollection.limit).toHaveBeenCalledWith(13); // デフォルトlimit 12 + 1
		});

		it("ページネーション（page番号ベース）が正しく動作する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				empty: true,
				docs: [],
			});

			await getVideoTitles({ page: 3, limit: 10 });

			expect(mockCollection.offset).toHaveBeenCalledWith(20); // (3-1) * 10
			expect(mockCollection.limit).toHaveBeenCalledWith(11); // limit + 1
		});

		it("ページネーション（startAfter）が正しく動作する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockStartAfterDoc = {
				exists: true,
			};

			mockCollection.doc.mockReturnValue({
				get: vi.fn().mockResolvedValue(mockStartAfterDoc),
			});

			mockCollection.get.mockResolvedValue({
				empty: true,
				docs: [],
			});

			await getVideoTitles({ startAfterDocId: "start-after-id", limit: 5 });

			expect(mockCollection.doc).toHaveBeenCalledWith("start-after-id");
			expect(mockCollection.startAfter).toHaveBeenCalledWith(mockStartAfterDoc);
		});

		it("startAfterドキュメントが存在しない場合はstartAfterを無視する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.doc.mockReturnValue({
				get: vi.fn().mockResolvedValue({ exists: false }),
			});

			mockCollection.get.mockResolvedValue({
				empty: true,
				docs: [],
			});

			await getVideoTitles({ startAfterDocId: "non-existent-id" });

			expect(mockCollection.startAfter).not.toHaveBeenCalled();
		});

		it("hasMoreフラグが正しく設定される", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			// limit+1件のドキュメントを返す（hasMore = true）
			const mockDocs = Array(6)
				.fill(null)
				.map((_, index) => ({
					id: `video-${index}`,
					data: () => createMockVideoData({ title: `Video ${index}` }),
				}));

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: mockDocs,
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) =>
				createMockFrontendVideo({ id: data.id, title: data.title }),
			);

			const result = await getVideoTitles({ limit: 5 });

			expect(result.videos).toHaveLength(5); // limitまでのみ返す
			expect(result.hasMore).toBe(true); // limit+1件あるのでtrue
			expect(result.lastVideo).toBeDefined();
		});

		it("Timestampの変換が正しく行われる", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const publishedDate = new Date("2023-01-01T12:00:00Z");
			const lastFetchedDate = new Date("2023-01-02T15:30:00Z");

			const mockDoc = {
				id: "video-1",
				data: () =>
					createMockVideoData({
						publishedAt: Timestamp.fromDate(publishedDate),
						lastFetchedAt: Timestamp.fromDate(lastFetchedDate),
					}),
			};

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: [mockDoc],
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) => {
				expect(data.publishedAt).toBe(publishedDate.toISOString());
				expect(data.lastFetchedAt).toBe(lastFetchedDate.toISOString());
				return createMockFrontendVideo();
			});

			await getVideoTitles({ limit: 1 });

			expect(convertToFrontendVideo).toHaveBeenCalledWith(
				expect.objectContaining({
					publishedAt: publishedDate.toISOString(),
					lastFetchedAt: lastFetchedDate.toISOString(),
				}),
			);
		});

		it("Timestampでないデータの場合は現在時刻を使用する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockDoc = {
				id: "video-1",
				data: () => ({
					videoId: "test-video",
					title: "Test Video",
					channelId: "UC123",
					channelTitle: "Test Channel",
					publishedAt: "invalid-timestamp", // Timestampでない
					lastFetchedAt: null, // Timestampでない
				}),
			};

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: [mockDoc],
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) => {
				// 現在時刻が使用されることを確認（大まかな時間範囲で）
				const now = new Date();
				const providedTime = new Date(data.publishedAt);
				const timeDiff = Math.abs(now.getTime() - providedTime.getTime());
				expect(timeDiff).toBeLessThan(1000); // 1秒以内
				return createMockFrontendVideo();
			});

			await getVideoTitles({ limit: 1 });
		});

		it("年代フィルタが正しく適用される", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: [
					{
						id: "video-2023",
						data: () => createMockVideoData({ title: "2023 Video" }),
					},
				],
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) =>
				createMockFrontendVideo({ id: data.id, title: data.title }),
			);

			await getVideoTitles({ year: "2023", limit: 10 });

			// 年代フィルタのクエリが2回呼ばれることを確認
			expect(mockCollection.where).toHaveBeenCalledTimes(2);

			// 2023年1月1日以降のフィルタ
			expect(mockCollection.where).toHaveBeenCalledWith("publishedAt", ">=", expect.any(Timestamp));

			// 2024年1月1日未満のフィルタ
			expect(mockCollection.where).toHaveBeenCalledWith("publishedAt", "<", expect.any(Timestamp));
		});

		it("無効な年代パラメータは無視される", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				empty: false,
				docs: [],
			});

			await getVideoTitles({ year: "invalid-year", limit: 10 });

			// 年代フィルタが適用されないことを確認
			expect(mockCollection.where).not.toHaveBeenCalled();
		});
	});

	describe("getTotalVideoCount", () => {
		it("正常に総動画数を取得できる", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				size: 42,
			});

			const result = await getTotalVideoCount();

			expect(result).toBe(42);
			expect(mockCollection.select).toHaveBeenCalled(); // IDのみ取得で効率化
		});

		it("空のコレクションの場合は0を返す", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				size: 0,
			});

			const result = await getTotalVideoCount();

			expect(result).toBe(0);
		});

		it("年代フィルタ付きで総動画数を取得できる", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				size: 15,
			});

			const result = await getTotalVideoCount({ year: "2023" });

			expect(result).toBe(15);
			expect(mockCollection.select).toHaveBeenCalled(); // IDのみ取得で効率化
			expect(mockCollection.where).toHaveBeenCalledTimes(2);
		});

		it("無効な年代パラメータは無視される（getTotalVideoCount）", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			mockCollection.get.mockResolvedValue({
				size: 100,
			});

			const result = await getTotalVideoCount({ year: "invalid" });

			expect(result).toBe(100);
			expect(mockCollection.where).not.toHaveBeenCalled();
		});
	});

	describe("getVideoById", () => {
		it("正常に特定の動画を取得できる", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockVideoData = createMockVideoData({
				title: "Specific Video",
				videoId: "specific-video-id",
			});

			const mockDoc = {
				exists: true,
				data: () => mockVideoData,
				id: "specific-video-id",
			};

			mockCollection.doc.mockReturnValue({
				get: vi.fn().mockResolvedValue(mockDoc),
			});

			const expectedFrontendVideo = createMockFrontendVideo({
				title: "Specific Video",
				videoId: "specific-video-id",
			});

			(convertToFrontendVideo as Mock).mockReturnValue(expectedFrontendVideo);

			const result = await getVideoById("specific-video-id");

			expect(result).toEqual(expectedFrontendVideo);
			expect(mockCollection.doc).toHaveBeenCalledWith("specific-video-id");
			expect(convertToFrontendVideo).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "specific-video-id",
					videoId: "specific-video-id",
					title: "Specific Video",
				}),
			);
		});

		it("videoIdがない場合はドキュメントIDを使用する", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockVideoData = {
				title: "Video without videoId",
				channelId: "UC123",
				channelTitle: "Test Channel",
				publishedAt: Timestamp.fromDate(new Date("2023-01-01T12:00:00Z")),
				lastFetchedAt: Timestamp.fromDate(new Date("2023-01-02T12:00:00Z")),
				// videoIdが存在しない
			};

			const mockDoc = {
				exists: true,
				data: () => mockVideoData,
				id: "doc-id",
			};

			mockCollection.doc.mockReturnValue({
				get: vi.fn().mockResolvedValue(mockDoc),
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) => {
				expect(data.videoId).toBe("doc-id"); // ドキュメントIDが使用される
				return createMockFrontendVideo({ videoId: "doc-id" });
			});

			await getVideoById("doc-id");

			expect(convertToFrontendVideo).toHaveBeenCalledWith(
				expect.objectContaining({
					videoId: "doc-id",
				}),
			);
		});

		it("デフォルト値が正しく設定される", async () => {
			const { mockFirestore, mockCollection } = createMockFirestore();
			(getFirestore as Mock).mockReturnValue(mockFirestore);

			const mockVideoData = {
				title: "Minimal Video",
				channelId: "UC123",
				channelTitle: "Test Channel",
				publishedAt: Timestamp.fromDate(new Date("2023-01-01T12:00:00Z")),
				lastFetchedAt: Timestamp.fromDate(new Date("2023-01-02T12:00:00Z")),
				// description, thumbnailUrl, audioButtonCount, hasAudioButtons が存在しない
			};

			const mockDoc = {
				exists: true,
				data: () => mockVideoData,
				id: "minimal-video",
			};

			mockCollection.doc.mockReturnValue({
				get: vi.fn().mockResolvedValue(mockDoc),
			});

			(convertToFrontendVideo as Mock).mockImplementation((data) => {
				expect(data.description).toBe("");
				expect(data.thumbnailUrl).toBe("");
				expect(data.audioButtonCount).toBe(0);
				expect(data.hasAudioButtons).toBe(false);
				return createMockFrontendVideo();
			});

			await getVideoById("minimal-video");
		});
	});
});
