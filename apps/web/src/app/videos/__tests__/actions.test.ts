import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVideosForGenericList } from "../actions";

// Firebaseモック
vi.mock("@/lib/firebase-admin");

describe("fetchVideosForGenericList", () => {
	let mockCollection: any;
	let mockQuery: any;
	let mockFirestore: any;

	beforeEach(async () => {
		// モックのリセット
		vi.clearAllMocks();

		// 基本的なクエリチェーンのモック
		mockQuery = {
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			get: vi.fn(),
		};

		mockCollection = vi.fn(() => mockQuery);
		mockFirestore = {
			collection: mockCollection,
		};

		// firebase-adminモジュールをモック
		const { admin } = await import("@/lib/firebase-admin");
		vi.mocked(admin).firestore = vi.fn(() => mockFirestore) as any;
	});

	describe("基本的な動作", () => {
		it("デフォルトパラメータで正しくデータを取得する", async () => {
			// モックデータ
			const mockVideos: VideoPlainObject[] = [
				{
					id: "video1",
					title: "テスト動画1",
					thumbnailUrl: "https://example.com/thumb1.jpg",
					publishedAt: new Date("2024-01-01").toISOString(),
					categoryNames: ["ゲーム"],
					isPublic: true,
					duration: "PT10M",
					viewCount: 1000,
					likeCount: 100,
					commentCount: 10,
					videoType: "regular",
					channelId: "channel1",
					channelTitle: "テストチャンネル",
					description: "説明文",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];

			// getメソッドのモック
			mockQuery.get.mockResolvedValue({
				size: 1,
				docs: [
					{
						id: "video1",
						data: () => mockVideos[0],
					},
				],
			});

			const result = await fetchVideosForGenericList({});

			// アサーション
			expect(result.items).toHaveLength(1);
			expect(result.totalCount).toBe(1);
			expect(result.filteredCount).toBe(1);
			expect(result.items[0]).toEqual(mockVideos[0]);

			// クエリの呼び出しを確認
			expect(mockQuery.where).toHaveBeenCalledWith("isPublic", "==", true);
			expect(mockQuery.orderBy).toHaveBeenCalledWith("publishedAt", "desc");
			expect(mockQuery.limit).toHaveBeenCalledWith(12);
			expect(mockQuery.offset).toHaveBeenCalledWith(0);
		});

		it("ページネーションが正しく動作する", async () => {
			mockQuery.get.mockResolvedValue({
				size: 0,
				docs: [],
			});

			await fetchVideosForGenericList({
				page: 2,
				limit: 24,
			});

			expect(mockQuery.limit).toHaveBeenCalledWith(24);
			expect(mockQuery.offset).toHaveBeenCalledWith(24); // (2-1) * 24
		});

		it("ソート順が正しく適用される", async () => {
			mockQuery.get.mockResolvedValue({
				size: 0,
				docs: [],
			});

			// 新しい順
			await fetchVideosForGenericList({ sort: "newest" });
			expect(mockQuery.orderBy).toHaveBeenCalledWith("publishedAt", "desc");

			// 古い順
			vi.clearAllMocks();
			mockQuery.get.mockResolvedValue({ size: 0, docs: [] });
			await fetchVideosForGenericList({ sort: "oldest" });
			expect(mockQuery.orderBy).toHaveBeenCalledWith("publishedAt", "asc");
		});
	});

	describe("フィルタリング機能", () => {
		it("フィルタが適用されている場合、全件取得してメモリ上でフィルタリングする", async () => {
			const allVideos: VideoPlainObject[] = [
				{
					id: "video1",
					title: "2024年の動画",
					publishedAt: new Date("2024-06-01").toISOString(),
					categoryNames: ["ゲーム"],
					videoType: "regular",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: "video2",
					title: "2023年の動画",
					publishedAt: new Date("2023-06-01").toISOString(),
					categoryNames: ["音楽"],
					videoType: "regular",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];

			// 全件取得のモック
			mockQuery.get.mockResolvedValue({
				size: 2,
				docs: allVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			// 年代フィルタ
			const result = await fetchVideosForGenericList({
				filters: { year: "2024" },
			});

			// limitとoffsetが呼ばれていないことを確認（全件取得のため）
			expect(mockQuery.limit).not.toHaveBeenCalled();
			expect(mockQuery.offset).not.toHaveBeenCalled();

			// フィルタリング結果を確認
			expect(result.items).toHaveLength(1);
			expect(result.items[0].id).toBe("video1");
			expect(result.totalCount).toBe(2); // 全体の件数
			expect(result.filteredCount).toBe(1); // フィルタ後の件数
		});

		it("複数のフィルタを組み合わせて正しくフィルタリングする", async () => {
			const allVideos: VideoPlainObject[] = [
				{
					id: "video1",
					title: "2024年のゲーム実況",
					publishedAt: new Date("2024-06-01").toISOString(),
					categoryNames: ["ゲーム"],
					videoType: "regular",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: "video2",
					title: "2024年の音楽配信",
					publishedAt: new Date("2024-06-01").toISOString(),
					categoryNames: ["音楽"],
					videoType: "live_archive",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];

			mockQuery.get.mockResolvedValue({
				size: 2,
				docs: allVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const result = await fetchVideosForGenericList({
				filters: {
					year: "2024",
					categoryNames: "ゲーム",
					videoType: "regular",
				},
			});

			expect(result.items).toHaveLength(1);
			expect(result.items[0].id).toBe("video1");
		});

		it("検索キーワードで正しくフィルタリングする", async () => {
			const allVideos: VideoPlainObject[] = [
				{
					id: "video1",
					title: "歌枠配信アーカイブ",
					publishedAt: new Date().toISOString(),
					categoryNames: [],
					videoType: "regular",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: "video2",
					title: "雑談配信",
					publishedAt: new Date().toISOString(),
					categoryNames: [],
					videoType: "regular",
					isPublic: true,
					thumbnailUrl: "",
					duration: "PT10M",
					viewCount: 0,
					likeCount: 0,
					commentCount: 0,
					channelId: "",
					channelTitle: "",
					description: "",
					actualStartTime: null,
					actualEndTime: null,
					scheduledStartTime: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];

			mockQuery.get.mockResolvedValue({
				size: 2,
				docs: allVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const result = await fetchVideosForGenericList({
				search: "歌枠",
			});

			expect(result.items).toHaveLength(1);
			expect(result.items[0].title).toContain("歌枠");
		});
	});

	describe("エラーハンドリング", () => {
		it("Firestoreエラー時に適切にエラーをスローする", async () => {
			mockQuery.get.mockRejectedValue(new Error("Firestore error"));

			await expect(fetchVideosForGenericList({})).rejects.toThrow("Firestore error");
		});

		it("不正なパラメータでもクラッシュしない", async () => {
			mockQuery.get.mockResolvedValue({
				size: 0,
				docs: [],
			});

			// 不正なページ番号
			const result1 = await fetchVideosForGenericList({ page: -1 });
			expect(result1.items).toHaveLength(0);
			expect(mockQuery.offset).toHaveBeenCalledWith(0); // 0にクランプされる

			// 不正なリミット
			const result2 = await fetchVideosForGenericList({ limit: 0 });
			expect(result2.items).toHaveLength(0);
			expect(mockQuery.limit).toHaveBeenCalledWith(1); // 1にクランプされる
		});
	});

	describe("データ変換", () => {
		it("Firestoreドキュメントを正しくPlainObjectに変換する", async () => {
			const firestoreData = {
				title: "テスト動画",
				thumbnailUrl: "https://example.com/thumb.jpg",
				publishedAt: { toDate: () => new Date("2024-01-01") },
				categoryNames: ["ゲーム"],
				isPublic: true,
				duration: "PT10M",
				viewCount: 1000,
				likeCount: 100,
				commentCount: 10,
				videoType: "regular",
				channelId: "channel1",
				channelTitle: "テストチャンネル",
				description: "説明文",
				actualStartTime: null,
				actualEndTime: null,
				scheduledStartTime: null,
				createdAt: { toDate: () => new Date() },
				updatedAt: { toDate: () => new Date() },
			};

			mockQuery.get.mockResolvedValue({
				size: 1,
				docs: [
					{
						id: "video1",
						data: () => firestoreData,
					},
				],
			});

			const result = await fetchVideosForGenericList({});

			expect(result.items[0].id).toBe("video1");
			expect(result.items[0].publishedAt).toBe(new Date("2024-01-01").toISOString());
			expect(result.items[0].title).toBe("テスト動画");
		});
	});
});
