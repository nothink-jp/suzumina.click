import type { FirestoreDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSuzuminaWorks, getWorkById, getWorks, getWorksByCircle } from "./actions";

// Firestoreモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockDocGet = vi.fn();
const mockWhere = vi.fn();

// Firestoreインスタンスのモック
const mockFirestore = {
	collection: mockCollection,
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
const createMockWorkData = (
	productId: string,
	title: string,
	circle = "テストサークル",
): FirestoreDLsiteWorkData => ({
	id: productId,
	productId,
	title,
	circle,
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

describe("admin works actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("getWorks", () => {
		it("should sort works by DLsite ID format correctly (admin version)", async () => {
			// 管理者版は limit=100 がデフォルト
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

		it("should use admin default limit of 100", async () => {
			const mockWorks = Array.from({ length: 5 }, (_, i) =>
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

			// パラメータなしで呼び出し（管理者版のデフォルト: limit=100）
			const result = await getWorks();

			expect(result.works).toHaveLength(5);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(5);
		});

		it("should handle large datasets with correct pagination logic", async () => {
			const mockWorks = Array.from({ length: 250 }, (_, i) =>
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

			// 2ページ目を取得（limit=100）
			const result = await getWorks({ page: 2, limit: 100 });

			expect(result.works).toHaveLength(100);
			expect(result.hasMore).toBe(true); // 250 > 200なのでtrue
			expect(result.totalCount).toBe(250);
		});
	});

	describe("getWorkById", () => {
		it("should return work data for existing work", async () => {
			const mockWork = createMockWorkData("RJ123456", "テスト作品");

			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue({ get: mockDocGet });
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
			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue({ get: mockDocGet });
			mockDocGet.mockResolvedValue({
				exists: false,
			});

			const result = await getWorkById("RJ999999");

			expect(result).toBeNull();
		});

		it("should return null on Firestore error", async () => {
			mockCollection.mockReturnValue({ doc: mockDoc });
			mockDoc.mockReturnValue({ get: mockDocGet });
			mockDocGet.mockRejectedValue(new Error("Firestore接続エラー"));

			const result = await getWorkById("RJ123456");

			expect(result).toBeNull();
		});
	});

	describe("getWorksByCircle", () => {
		it("should search works by circle name correctly", async () => {
			const targetCircle = "特定サークル";
			const mockWorks = [
				createMockWorkData("RJ123456", "作品1", targetCircle),
				createMockWorkData("RJ234567", "作品2", targetCircle),
				createMockWorkData("RJ01345678", "作品3", targetCircle),
			];

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getWorksByCircle({
				circle: targetCircle,
				page: 1,
				limit: 10,
			});

			expect(result.works).toHaveLength(3);
			expect(mockCollection).toHaveBeenCalledWith("dlsiteWorks");
			expect(mockWhere).toHaveBeenCalledWith("circle", "==", targetCircle);

			// DLsite ID順ソートの確認（新しい形式が先）
			expect(result.works[0].productId).toBe("RJ01345678");
		});

		it("should handle circle search with pagination", async () => {
			const targetCircle = "大きなサークル";
			const mockWorks = Array.from({ length: 15 }, (_, i) =>
				createMockWorkData(
					`RJ${String(123456 + i).padStart(6, "0")}`,
					`作品${i + 1}`,
					targetCircle,
				),
			);

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getWorksByCircle({
				circle: targetCircle,
				page: 1,
				limit: 10,
			});

			expect(result.works).toHaveLength(10);
			expect(result.hasMore).toBe(true);
			expect(result.totalCount).toBe(15);
		});

		it("should return empty result when circle not found", async () => {
			const mockSnapshot = {
				size: 0,
				docs: [],
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getWorksByCircle({
				circle: "存在しないサークル",
			});

			expect(result.works).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});

		it("should handle search error gracefully", async () => {
			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockRejectedValue(new Error("検索エラー"));

			const result = await getWorksByCircle({
				circle: "エラーサークル",
			});

			expect(result.works).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});
	});

	describe("getSuzuminaWorks", () => {
		it("should search for works with author name variations", async () => {
			const mockWorks = [
				createMockWorkData("RJ123456", "作品1", "サークルA"),
				createMockWorkData("RJ234567", "作品2", "サークルB"),
			];

			// 作品1には「涼花みなせ」、作品2には「suzuka minase」を設定
			mockWorks[0].author = ["涼花みなせ", "他の声優"];
			mockWorks[1].author = ["suzuka minase"];

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getSuzuminaWorks({ page: 1, limit: 10 });

			expect(result.works).toHaveLength(2);
			expect(mockCollection).toHaveBeenCalledWith("dlsiteWorks");
			expect(mockWhere).toHaveBeenCalledWith("author", "array-contains-any", [
				"涼花みなせ",
				"suzuka minase",
				"すずかみなせ",
				"鈴花みなせ",
			]);
		});

		it("should sort Suzumina works by DLsite ID correctly", async () => {
			const mockWorks = [
				createMockWorkData("RJ123456", "古い作品", "サークルA"),
				createMockWorkData("RJ01234567", "新しい作品", "サークルB"),
			];

			for (const work of mockWorks) {
				work.author = ["涼花みなせ"];
			}

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getSuzuminaWorks();

			expect(result.works).toHaveLength(2);
			// 新しい形式（8桁）が先に来るべき
			expect(result.works[0].productId).toBe("RJ01234567");
			expect(result.works[1].productId).toBe("RJ123456");
		});

		it("should handle pagination for Suzumina works", async () => {
			const mockWorks = Array.from({ length: 25 }, (_, i) =>
				createMockWorkData(`RJ${String(123456 + i).padStart(6, "0")}`, `みなせ作品${i + 1}`),
			);

			for (const work of mockWorks) {
				work.author = ["涼花みなせ"];
			}

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getSuzuminaWorks({ page: 1, limit: 10 });

			expect(result.works).toHaveLength(10);
			expect(result.hasMore).toBe(true);
			expect(result.totalCount).toBe(25);
		});

		it("should use admin default limit of 100 for Suzumina works", async () => {
			const mockWorks = Array.from({ length: 5 }, (_, i) =>
				createMockWorkData(`RJ${String(123456 + i).padStart(6, "0")}`, `みなせ作品${i + 1}`),
			);

			for (const work of mockWorks) {
				work.author = ["涼花みなせ"];
			}

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			// パラメータなしで呼び出し（管理者版のデフォルト: limit=100）
			const result = await getSuzuminaWorks();

			expect(result.works).toHaveLength(5);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(5);
		});

		it("should handle no Suzumina works found", async () => {
			const mockSnapshot = {
				size: 0,
				docs: [],
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getSuzuminaWorks();

			expect(result.works).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});

		it("should handle Suzumina search error gracefully", async () => {
			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockRejectedValue(new Error("みなせ検索エラー"));

			const result = await getSuzuminaWorks();

			expect(result.works).toHaveLength(0);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});

		it("should handle data conversion errors in Suzumina works", async () => {
			const mockWorks = [
				createMockWorkData("RJ123456", "正常な作品"),
				createMockWorkData("RJ234567", "エラー作品"),
			];

			for (const work of mockWorks) {
				work.author = ["涼花みなせ"];
			}

			const mockSnapshot = {
				size: mockWorks.length,
				docs: mockWorks.map((work) => ({
					data: () => work,
					id: work.productId,
				})),
			};

			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({ get: mockGet });
			mockGet.mockResolvedValue(mockSnapshot);

			// convertToFrontendWorkが2番目の作品でエラーを投げるようにモック
			const { convertToFrontendWork } = await import("@suzumina.click/shared-types/src/work");
			vi.mocked(convertToFrontendWork).mockImplementation((data) => {
				if (data.title === "エラー作品") {
					throw new Error("変換エラー");
				}
				return {
					...data,
					createdAt: data.createdAt?.toISOString?.() || data.createdAt,
					updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt,
					lastFetchedAt: data.lastFetchedAt?.toISOString?.() || data.lastFetchedAt,
				};
			});

			const result = await getSuzuminaWorks();

			// エラーがあった作品は除外され、正常な作品のみ返される
			expect(result.works).toHaveLength(1);
			expect(result.works[0].title).toBe("正常な作品");
			expect(result.totalCount).toBe(2); // 総数は元のデータ数
		});
	});
});
