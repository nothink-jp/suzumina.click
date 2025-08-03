import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVideosForGenericList } from "../actions";

// Firebaseモック
vi.mock("@/lib/firebase-admin");

// 大量のモックデータを生成
const generateMockVideos = (count: number): VideoPlainObject[] => {
	const videoTypes = ["live_archive", "premiere", "live_upcoming", "regular"];
	const categories = ["ゲーム", "音楽", "エンターテインメント"];
	const titleTypes = ["歌枠", "ゲーム実況", "雑談"];

	return Array.from({ length: count }, (_, i) => {
		const videoTypeIndex = i % 4;
		const categoryIndex = i % 3;
		const titleIndex = i % 10 === 0 ? 0 : i % 5 === 0 ? 1 : 2;
		const now = new Date().toISOString();

		return {
			id: `video-${i}`,
			title: `テスト動画 ${i} - ${titleTypes[titleIndex]}配信`,
			thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
			publishedAt: new Date(2024, 0, 1 + (i % 365)).toISOString(),
			categoryNames: [categories[categoryIndex]],
			isPublic: true,
			duration: `PT${10 + (i % 50)}M`,
			viewCount: 1000 + i * 100,
			likeCount: 100 + i * 10,
			commentCount: 10 + i,
			videoType: videoTypes[videoTypeIndex],
			channelId: "channel1",
			channelTitle: "テストチャンネル",
			description: `説明文 ${i}`,
			actualStartTime: videoTypeIndex === 0 ? now : null,
			actualEndTime: videoTypeIndex === 0 ? now : null,
			scheduledStartTime: videoTypeIndex === 2 ? now : null,
			createdAt: now,
			updatedAt: now,
		};
	});
};

describe("fetchVideosForGenericList パフォーマンステスト", () => {
	let mockCollection: any;
	let mockQuery: any;
	let mockFirestore: any;

	beforeEach(async () => {
		vi.clearAllMocks();

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

	describe("通常のページネーション性能", () => {
		it("12件の取得が高速に完了する", async () => {
			const mockVideos = generateMockVideos(12);
			mockQuery.get.mockResolvedValue({
				size: 12,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			await fetchVideosForGenericList({ page: 1, limit: 12 });
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(100); // 100ms以内
		});

		it("ページサイズが大きくても性能が維持される", async () => {
			const mockVideos = generateMockVideos(48);
			mockQuery.get.mockResolvedValue({
				size: 48,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			await fetchVideosForGenericList({ page: 1, limit: 48 });
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(150); // 150ms以内
		});
	});

	describe("フィルタリング性能", () => {
		it("少量データのフィルタリングが高速", async () => {
			const mockVideos = generateMockVideos(100);
			mockQuery.get.mockResolvedValue({
				size: 100,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			await fetchVideosForGenericList({
				filters: { year: "2024", categoryNames: "ゲーム" },
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(50); // 50ms以内
		});

		it("中規模データ（370件）のフィルタリング性能", async () => {
			const mockVideos = generateMockVideos(370);
			mockQuery.get.mockResolvedValue({
				size: 370,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			const result = await fetchVideosForGenericList({
				filters: { year: "2024" },
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(100); // 100ms以内
			expect(result.filteredCount).toBeLessThan(result.totalCount);
		});

		it("大規模データ（1000件）のフィルタリング性能警告", async () => {
			const mockVideos = generateMockVideos(1000);
			mockQuery.get.mockResolvedValue({
				size: 1000,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			await fetchVideosForGenericList({
				filters: { year: "2024", categoryNames: "ゲーム", videoType: "regular" },
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			console.warn(`⚠️ 1000件のフィルタリング処理時間: ${executionTime.toFixed(2)}ms`);

			// 1000件でも実用的な速度（500ms以内）であることを確認
			expect(executionTime).toBeLessThan(500);
		});
	});

	describe("検索性能", () => {
		it("検索処理が高速に実行される", async () => {
			const mockVideos = generateMockVideos(370);
			mockQuery.get.mockResolvedValue({
				size: 370,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			const result = await fetchVideosForGenericList({
				search: "歌枠",
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(100); // 100ms以内

			// 検索結果が正しくフィルタリングされていることを確認
			const filteredCount = mockVideos.filter((v) => v.title.includes("歌枠")).length;
			expect(result.filteredCount).toBe(filteredCount);
		});

		it("複雑な検索条件でも性能が維持される", async () => {
			const mockVideos = generateMockVideos(500);
			mockQuery.get.mockResolvedValue({
				size: 500,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			await fetchVideosForGenericList({
				search: "ゲーム",
				filters: { year: "2024", categoryNames: "ゲーム" },
				sort: "oldest",
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			expect(executionTime).toBeLessThan(200); // 200ms以内
		});
	});

	describe("メモリ使用量の検証", () => {
		it("大量データ処理時のメモリ効率", async () => {
			const mockVideos = generateMockVideos(1000);
			const initialMemory = process.memoryUsage().heapUsed;

			mockQuery.get.mockResolvedValue({
				size: 1000,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			await fetchVideosForGenericList({
				filters: { year: "2024" },
			});

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

			console.log(`メモリ使用量増加: ${memoryIncrease.toFixed(2)}MB`);

			// メモリ使用量が妥当な範囲内（50MB以内）であることを確認
			expect(memoryIncrease).toBeLessThan(50);
		});
	});

	describe("並行処理性能", () => {
		it("複数の同時リクエストを効率的に処理", async () => {
			const mockVideos = generateMockVideos(100);
			mockQuery.get.mockResolvedValue({
				size: 100,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();

			// 5つの並行リクエスト
			const promises = [
				fetchVideosForGenericList({ page: 1 }),
				fetchVideosForGenericList({ page: 2 }),
				fetchVideosForGenericList({ filters: { year: "2024" } }),
				fetchVideosForGenericList({ search: "ゲーム" }),
				fetchVideosForGenericList({ sort: "oldest" }),
			];

			await Promise.all(promises);
			const endTime = performance.now();

			const executionTime = endTime - startTime;
			console.log(`5並行リクエスト処理時間: ${executionTime.toFixed(2)}ms`);

			// 並行処理でも合理的な時間内に完了
			expect(executionTime).toBeLessThan(300);
		});
	});

	describe("最適化の推奨事項", () => {
		it("将来的なスケーラビリティの警告", async () => {
			// 5000件のデータでのシミュレーション
			const mockVideos = generateMockVideos(5000);
			mockQuery.get.mockResolvedValue({
				size: 5000,
				docs: mockVideos.map((video) => ({
					id: video.id,
					data: () => video,
				})),
			});

			const startTime = performance.now();
			const result = await fetchVideosForGenericList({
				filters: { year: "2024", categoryNames: "ゲーム" },
			});
			const endTime = performance.now();

			const executionTime = endTime - startTime;

			console.warn(`
⚠️ パフォーマンス警告:
- 処理件数: 5000件
- 処理時間: ${executionTime.toFixed(2)}ms
- フィルタ後: ${result.filteredCount}件

推奨事項:
1. Firestoreの複合インデックスを活用したサーバーサイドフィルタリング
2. 年代別コレクションの分割
3. キャッシュ戦略の実装
4. 仮想スクロールの導入
			`);

			// 5000件でも動作はするが、パフォーマンス改善が必要
			expect(executionTime).toBeLessThan(2000);
		});
	});
});
