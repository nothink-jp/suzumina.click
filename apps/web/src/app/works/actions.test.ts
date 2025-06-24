import type { FirestoreDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkById, getWorks } from "./actions";

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
vi.mock("@suzumina.click/shared-types/src/work", () => ({
	convertToFrontendWork: vi.fn((data) => ({
		...data,
		// フロントエンド用の変換処理をシンプルにモック
		createdAt: data.createdAt?.toISOString?.() || data.createdAt,
		updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt,
		lastFetchedAt: data.lastFetchedAt?.toISOString?.() || data.lastFetchedAt,
	})),
}));

// テスト用のサンプルデータ
const createMockWorkData = (productId: string, title: string): FirestoreDLsiteWorkData => ({
	id: productId,
	productId,
	title,
	circle: "テストサークル",
	author: ["テスト作者"],
	category: "音声作品",
	workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`,
	price: 1000,
	rating: 4.5,
	salesCount: 100,
	tags: ["テストタグ"],
	thumbnailUrl: `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}/${productId}_img_main.jpg`,
	createdAt: new Date("2023-01-01"),
	updatedAt: new Date("2023-01-01"),
	lastFetchedAt: new Date("2023-01-01"),
});

describe("works actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("getWorks", () => {
		it("should sort works by DLsite ID format correctly", async () => {
			// DLsite IDの形式テスト: 新しい形式(長い)が先に来るべき
			const mockWorks = [
				createMockWorkData("RJ123456", "古い形式6桁"),
				createMockWorkData("RJ01234567", "新しい形式8桁"),
				createMockWorkData("RJ234567", "古い形式6桁2"),
				createMockWorkData("RJ01345678", "新しい形式8桁2"),
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

			const result = await getWorks({ page: 1, limit: 10 });

			expect(result.works).toHaveLength(4);
			// 8桁の新しい形式が先に来るべき
			expect(result.works[0].productId).toBe("RJ01345678");
			expect(result.works[1].productId).toBe("RJ01234567");
			// 同じ長さ（6桁）内では辞書順降順
			expect(result.works[2].productId).toBe("RJ234567");
			expect(result.works[3].productId).toBe("RJ123456");
		});

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
			const { convertToFrontendWork } = await import("@suzumina.click/shared-types/src/work");
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
			mockWork.id = undefined; // IDフィールドを削除

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
