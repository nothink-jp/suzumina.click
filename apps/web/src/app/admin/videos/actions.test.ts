import { Timestamp } from "@google-cloud/firestore";
import type { FirestoreServerVideoData } from "@suzumina.click/shared-types/src/video";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTotalVideoCount, getVideoById, getVideoTitles } from "./actions";

// Firestoreモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockDocGet = vi.fn();
const mockOrderBy = vi.fn();
const mockStartAfter = vi.fn();
const mockOffset = vi.fn();
const mockLimit = vi.fn();
const _mockCount = vi.fn();

// Firestoreインスタンスのモック
const mockFirestore = {
	collection: mockCollection,
};

// getFirestoreのモック
vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

// convertToFrontendVideoのモック
vi.mock("@suzumina.click/shared-types/src/video", () => ({
	convertToFrontendVideo: vi.fn((data) => ({
		...data,
		// フロントエンド用の変換処理をシンプルにモック
		duration: "PT5M30S",
		viewCount: 1000,
		likeCount: 100,
		commentCount: 10,
		tags: ["tag1", "tag2"],
	})),
}));

// テスト用のサンプルデータ
const createMockVideoData = (
	videoId: string,
	title: string,
	publishedAt: Date = new Date("2023-01-01"),
): FirestoreServerVideoData => ({
	videoId,
	title,
	description: "テスト動画の説明",
	channelId: "UC123456",
	channelTitle: "テストチャンネル",
	publishedAt: Timestamp.fromDate(publishedAt),
	thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
	lastFetchedAt: Timestamp.fromDate(new Date()),
	videoType: "video",
	liveBroadcastContent: "none",
});

describe("admin videos actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});

		// デフォルトのクエリチェーンのモック
		mockOrderBy.mockReturnValue({
			startAfter: mockStartAfter,
			offset: mockOffset,
			limit: mockLimit,
		});
		mockStartAfter.mockReturnValue({ limit: mockLimit });
		mockOffset.mockReturnValue({ limit: mockLimit });
		mockLimit.mockReturnValue({ get: mockGet });
	});

	describe("getVideoTitles", () => {
		it("should fetch videos with default pagination", async () => {
			const mockVideos = [
				createMockVideoData("video1", "テスト動画1"),
				createMockVideoData("video2", "テスト動画2"),
			];

			const mockSnapshot = {
				empty: false,
				docs: mockVideos.map((video, index) => ({
					id: `doc${index + 1}`,
					data: () => video,
				})),
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles();

			expect(result.videos).toHaveLength(2);
			expect(result.hasMore).toBe(false);
			expect(mockCollection).toHaveBeenCalledWith("videos");
			expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "desc");
			expect(mockLimit).toHaveBeenCalledWith(101); // limit + 1 for hasMore detection
		});

		it("should handle startAfter pagination correctly", async () => {
			const mockVideos = [createMockVideoData("video1", "テスト動画1")];

			const mockStartAfterDoc = {
				exists: true,
				data: () => mockVideos[0],
			};

			const mockSnapshot = {
				empty: false,
				docs: mockVideos.map((video) => ({
					id: "doc1",
					data: () => video,
				})),
			};

			mockCollection.mockReturnValue({
				orderBy: mockOrderBy,
				doc: mockDoc,
			});
			mockDoc.mockReturnValue({
				get: vi.fn().mockResolvedValue(mockStartAfterDoc),
			});
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles({
				startAfterDocId: "startDoc",
				limit: 10,
			});

			expect(result.videos).toHaveLength(1);
			expect(mockDoc).toHaveBeenCalledWith("startDoc");
			expect(mockStartAfter).toHaveBeenCalledWith(mockStartAfterDoc);
		});

		it("should handle offset-based pagination for page > 1", async () => {
			const mockVideos = [createMockVideoData("video1", "テスト動画1")];

			const mockSnapshot = {
				empty: false,
				docs: mockVideos.map((video) => ({
					id: "doc1",
					data: () => video,
				})),
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles({
				page: 3,
				limit: 5,
			});

			expect(result.videos).toHaveLength(1);
			expect(mockOffset).toHaveBeenCalledWith(10); // (3-1) * 5 = 10
			expect(mockLimit).toHaveBeenCalledWith(6); // 5 + 1 for hasMore detection
		});

		it("should detect hasMore correctly when there are more results", async () => {
			// 6つの動画があり、limit=5の場合、hasMore=trueになるべき
			const mockVideos = Array.from({ length: 6 }, (_, i) =>
				createMockVideoData(`video${i + 1}`, `テスト動画${i + 1}`),
			);

			const mockSnapshot = {
				empty: false,
				docs: mockVideos.map((video, index) => ({
					id: `doc${index + 1}`,
					data: () => video,
				})),
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles({ limit: 5 });

			expect(result.videos).toHaveLength(5); // limit分のみ処理
			expect(result.hasMore).toBe(true); // 6つ > 5つなのでtrue
		});

		it("should handle Timestamp conversion correctly", async () => {
			const testDate = new Date("2023-05-15T10:30:00Z");
			const mockVideo = createMockVideoData("video1", "テスト動画");
			mockVideo.publishedAt = Timestamp.fromDate(testDate);

			const mockSnapshot = {
				empty: false,
				docs: [
					{
						id: "doc1",
						data: () => mockVideo,
					},
				],
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			await getVideoTitles();

			// convertToFrontendVideoが正しいISO文字列で呼ばれることを確認
			const { convertToFrontendVideo } = await import("@suzumina.click/shared-types/src/video");
			expect(vi.mocked(convertToFrontendVideo)).toHaveBeenCalledWith(
				expect.objectContaining({
					publishedAt: testDate.toISOString(),
				}),
			);
		});

		it("should handle invalid Timestamp gracefully", async () => {
			const mockVideo = createMockVideoData("video1", "テスト動画");
			// Timestampではない値を設定
			(mockVideo as any).publishedAt = "invalid-timestamp";

			const mockSnapshot = {
				empty: false,
				docs: [
					{
						id: "doc1",
						data: () => mockVideo,
					},
				],
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles();

			expect(result.videos).toHaveLength(1);
			// エラーでフォールバックされた場合でも動画は処理される
		});

		it("should handle empty results", async () => {
			const mockSnapshot = {
				empty: true,
				docs: [],
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getVideoTitles();

			expect(result.videos).toHaveLength(0);
			expect(result.hasMore).toBe(false);
		});

		it("should handle data processing errors gracefully", async () => {
			const mockVideos = [
				createMockVideoData("video1", "正常な動画"),
				createMockVideoData("video2", "エラー動画"),
			];

			const mockSnapshot = {
				empty: false,
				docs: mockVideos.map((video, index) => ({
					id: `doc${index + 1}`,
					data: () => video,
				})),
			};

			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockResolvedValue(mockSnapshot);

			// convertToFrontendVideoが2番目の動画でエラーを投げるようにモック
			const { convertToFrontendVideo } = await import("@suzumina.click/shared-types/src/video");
			vi.mocked(convertToFrontendVideo).mockImplementation((data) => {
				if (data.title === "エラー動画") {
					throw new Error("変換エラー");
				}
				return {
					...data,
					duration: "PT5M30S",
					viewCount: 1000,
					likeCount: 100,
					commentCount: 10,
					tags: ["tag1", "tag2"],
				};
			});

			const result = await getVideoTitles();

			// エラーがあった動画は除外され、正常な動画のみ返される
			expect(result.videos).toHaveLength(1);
			expect(result.videos[0].title).toBe("正常な動画");
		});

		it("should return empty result on Firestore error", async () => {
			mockCollection.mockReturnValue({ orderBy: mockOrderBy });
			mockGet.mockRejectedValue(new Error("Firestore接続エラー"));

			const result = await getVideoTitles();

			expect(result.videos).toHaveLength(0);
			expect(result.hasMore).toBe(false);
		});
	});

	describe("getTotalVideoCount", () => {
		it("should return correct video count", async () => {
			const mockCountSnapshot = {
				data: () => ({ count: 42 }),
			};

			const mockCountQuery = {
				get: vi.fn().mockResolvedValue(mockCountSnapshot),
			};

			mockCollection.mockReturnValue({
				count: vi.fn().mockReturnValue(mockCountQuery),
			});

			const result = await getTotalVideoCount();

			expect(result).toBe(42);
			expect(mockCollection).toHaveBeenCalledWith("videos");
		});

		it("should return 0 on error", async () => {
			mockCollection.mockReturnValue({
				count: vi.fn().mockReturnValue({
					get: vi.fn().mockRejectedValue(new Error("カウントエラー")),
				}),
			});

			const result = await getTotalVideoCount();

			expect(result).toBe(0);
		});
	});

	describe("getVideoById", () => {
		it("should return video data for existing video", async () => {
			const mockVideo = createMockVideoData("video123", "テスト動画");

			mockCollection.mockReturnValue({
				doc: mockDoc,
			});
			mockDoc.mockReturnValue({
				get: mockDocGet,
			});
			mockDocGet.mockResolvedValue({
				exists: true,
				id: "video123",
				data: () => mockVideo,
			});

			const result = await getVideoById("video123");

			expect(result).toBeTruthy();
			expect(result?.videoId).toBe("video123");
			expect(result?.title).toBe("テスト動画");
			expect(mockCollection).toHaveBeenCalledWith("videos");
			expect(mockDoc).toHaveBeenCalledWith("video123");
		});

		it("should return null for non-existing video", async () => {
			mockCollection.mockReturnValue({
				doc: mockDoc,
			});
			mockDoc.mockReturnValue({
				get: mockDocGet,
			});
			mockDocGet.mockResolvedValue({
				exists: false,
			});

			const result = await getVideoById("nonexistent");

			expect(result).toBeNull();
		});

		it("should return null on Firestore error", async () => {
			mockCollection.mockReturnValue({
				doc: mockDoc,
			});
			mockDoc.mockReturnValue({
				get: mockDocGet,
			});
			mockDocGet.mockRejectedValue(new Error("Firestore接続エラー"));

			const result = await getVideoById("video123");

			expect(result).toBeNull();
		});

		it("should handle missing videoId field correctly", async () => {
			const mockVideo = createMockVideoData("video123", "テスト動画");
			(mockVideo as any).videoId = undefined; // videoIdフィールドを削除

			mockCollection.mockReturnValue({
				doc: mockDoc,
			});
			mockDoc.mockReturnValue({
				get: mockDocGet,
			});
			mockDocGet.mockResolvedValue({
				exists: true,
				id: "doc123",
				data: () => mockVideo,
			});

			const result = await getVideoById("doc123");

			expect(result).toBeTruthy();
			// videoIdがドキュメントIDから設定されることを確認
			const { convertToFrontendVideo } = await import("@suzumina.click/shared-types/src/video");
			expect(vi.mocked(convertToFrontendVideo)).toHaveBeenCalledWith(
				expect.objectContaining({
					videoId: "doc123", // doc.idがvideoIdとして使用される
				}),
			);
		});
	});
});
