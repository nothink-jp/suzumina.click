import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkById, getWorks } from "../actions";

// Firestoreモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockDocGet = vi.fn();

// Firestoreインスタンスのモック
const mockFirestore = {
	collection: mockCollection,
	doc: mockDoc,
};

// getFirestoreのモック
vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

// convertToFrontendWorkのモック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToFrontendWork: vi.fn((data) => ({
		...data,
		// フロントエンド用の変換処理をシンプルにモック
		createdAt: data.createdAt?.toISOString?.() || data.createdAt,
		updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt,
		lastFetchedAt: data.lastFetchedAt?.toISOString?.() || data.lastFetchedAt,
	})),
}));

// テスト用のサンプルデータ
const createMockWorkData = (
	productId: string,
	title: string,
): OptimizedFirestoreDLsiteWorkData => ({
	id: productId,
	productId,
	title,
	circle: "テストサークル",
	description: "テスト用の説明",
	voiceActors: ["テスト作者"],
	scenario: [],
	illustration: [],
	music: [],
	author: [],
	genres: ["テストジャンル"],
	category: "SOU",
	workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`,
	price: {
		current: 1000,
		currency: "JPY",
	},
	rating: {
		stars: 4.5,
		count: 100,
	},
	tags: ["テストタグ"],
	thumbnailUrl: `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}/${productId}_img_main.jpg`,
	sampleImages: [],
	// 追加の必須フィールド
	releaseDateISO: "2023-01-01",
	releaseDateDisplay: "2023年01月01日",
	dataSources: {
		searchResult: {
			lastFetched: "2023-01-01T00:00:00.000Z",
			genres: ["テストジャンル"],
			basicInfo: {} as any,
		},
	},
	createdAt: "2023-01-01T00:00:00.000Z",
	updatedAt: "2023-01-01T00:00:00.000Z",
	lastFetchedAt: "2023-01-01T00:00:00.000Z",
});

describe("works actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("getWorks", () => {
		it("should handle pagination correctly", async () => {
			const mockWorks = Array.from({ length: 15 }, (_, i) =>
				createMockWorkData(`RJ${String(123456 + i).padStart(6, "0")}`, `作品${i + 1}`),
			);

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			// 1ページ目（5件表示）
			const page1 = await getWorks({ page: 1, limit: 5 });
			expect(page1.works).toHaveLength(5);
			expect(page1.hasMore).toBe(true);
			expect(page1.totalCount).toBe(15);

			// 3ページ目（最後のページ）
			const page3 = await getWorks({ page: 3, limit: 5 });
			expect(page3.works).toHaveLength(5);
			expect(page3.hasMore).toBe(false);
			expect(page3.totalCount).toBe(15);

			// 4ページ目（範囲外）
			const page4 = await getWorks({ page: 4, limit: 5 });
			expect(page4.works).toHaveLength(0);
			expect(page4.hasMore).toBe(false);
		});

		it("should handle data conversion errors gracefully", async () => {
			const mockWorks = [
				createMockWorkData("RJ123456", "正常な作品"),
				// 不正なデータを含む作品
				{ ...createMockWorkData("RJ234567", "エラー作品"), invalidField: true },
			];

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			// convertToFrontendWorkが一部のデータでエラーを投げるようにモック
			const { convertToFrontendWork } = await import("@suzumina.click/shared-types");
			vi.mocked(convertToFrontendWork).mockImplementation((data) => {
				if ((data as any).invalidField) {
					throw new Error("変換エラー");
				}
				return {
					...data,
					createdAt: data.createdAt?.toISOString?.() || data.createdAt,
					updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt,
					lastFetchedAt: data.lastFetchedAt?.toISOString?.() || data.lastFetchedAt,
				};
			});

			const result = await getWorks({ page: 1, limit: 10 });

			// エラーがあった作品は除外され、正常な作品のみ返される
			expect(result.works).toHaveLength(1);
			expect(result.works[0].productId).toBe("RJ123456");
			expect(result.totalCount).toBe(2); // 総数は元のデータ数
		});

		it("should return empty result on Firestore error", async () => {
			mockCollection.mockReturnValue({ get: mockGet });
			mockGet.mockRejectedValue(new Error("Firestore接続エラー"));

			const result = await getWorks({ page: 1, limit: 10 });

			expect(result.works).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});

		it("should use default pagination parameters", async () => {
			const mockWorks = Array.from({ length: 20 }, (_, i) =>
				createMockWorkData(`RJ${String(123456 + i).padStart(6, "0")}`, `作品${i + 1}`),
			);

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			// パラメータなしで呼び出し（デフォルト: page=1, limit=12）
			const result = await getWorks();

			expect(result.works).toHaveLength(12);
			expect(result.hasMore).toBe(true);
			expect(result.totalCount).toBe(20);
		});

		it("should sort works by price when sort=price_low", async () => {
			const mockWorks = [
				{
					...createMockWorkData("RJ123456", "高い作品"),
					price: { current: 1500, currency: "JPY" },
				},
				{ ...createMockWorkData("RJ234567", "安い作品"), price: { current: 500, currency: "JPY" } },
				{
					...createMockWorkData("RJ345678", "中程度作品"),
					price: { current: 1000, currency: "JPY" },
				},
			];

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getWorks({ page: 1, limit: 10, sort: "price_low" });

			// 価格安い順
			expect(result.works[0].price?.current).toBe(500);
			expect(result.works[1].price?.current).toBe(1000);
			expect(result.works[2].price?.current).toBe(1500);
		});
	});

	describe("getWorkById", () => {
		it("should return work data for existing work", async () => {
			const mockWork = createMockWorkData("RJ123456", "テスト作品");

			const mockDocInstance = {
				get: mockDocGet,
			};

			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue(mockDocInstance);
			mockDocGet.mockResolvedValue({
				exists: true,
				data: () => mockWork,
				id: "RJ123456",
			});

			const result = await getWorkById("RJ123456");

			expect(result).toBeTruthy();
			expect(result?.productId).toBe("RJ123456");
			expect(result?.title).toBe("テスト作品");
			expect(mockCollection).toHaveBeenCalledWith("dlsiteWorks");
			expect(mockDoc).toHaveBeenCalledWith("RJ123456");
		});

		it("should return null for non-existing work", async () => {
			const mockDocInstance = {
				get: mockDocGet,
			};

			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue(mockDocInstance);
			mockDocGet.mockResolvedValue({
				exists: false,
			});

			const result = await getWorkById("RJ999999");

			expect(result).toBeNull();
		});

		it("should return null on Firestore error", async () => {
			const mockDocInstance = {
				get: mockDocGet,
			};

			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue(mockDocInstance);
			mockDocGet.mockRejectedValue(new Error("Firestore接続エラー"));

			const result = await getWorkById("RJ123456");

			expect(result).toBeNull();
		});

		it("should handle missing ID in document data", async () => {
			const mockWork = createMockWorkData("RJ123456", "テスト作品");
			delete (mockWork as any).id; // IDフィールドを削除

			const mockDocInstance = {
				get: mockDocGet,
			};

			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue(mockDocInstance);
			mockDocGet.mockResolvedValue({
				exists: true,
				data: () => mockWork,
				id: "RJ123456",
			});

			const result = await getWorkById("RJ123456");

			expect(result).toBeTruthy();
			expect(result?.productId).toBe("RJ123456");
			// IDがドキュメントIDから設定されることを確認
		});
	});
});
