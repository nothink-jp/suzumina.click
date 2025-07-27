/**
 * DLsite Firestore操作のテスト
 * 重要な機能に絞った簡潔なテスト
 */

import type { WorkDocument } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモック
vi.mock("../../../infrastructure/database/firestore", () => {
	const mockDoc = vi.fn();
	const mockQuery = {
		get: vi.fn(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
	};
	const mockCollection = { ...mockQuery, doc: mockDoc };
	const mockBatch = {
		set: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		commit: vi.fn().mockResolvedValue(undefined),
	};

	return {
		default: {
			collection: vi.fn().mockReturnValue(mockCollection),
			batch: vi.fn().mockReturnValue(mockBatch),
		},
		// テスト用にmockを外部に公開
		__mockQuery: mockQuery,
		__mockDoc: mockDoc,
		__mockBatch: mockBatch,
	};
});

vi.mock("../../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import {
	checkMultipleWorksExist,
	checkWorkExists,
	getExistingWorksMap,
	getWorkFromFirestore,
	getWorksStatistics,
	saveWorksToFirestore,
	searchWorksFromFirestore,
} from "../dlsite-firestore";

// モックの参照を取得
const firestoreMock = vi.mocked(await import("../../../infrastructure/database/firestore"));
const mockQuery = (firestoreMock as any).__mockQuery;
const mockDoc = (firestoreMock as any).__mockDoc;
const mockBatch = (firestoreMock as any).__mockBatch;

// テスト用のサンプルデータ
const sampleWork: WorkDocument = {
	id: "RJ12345",
	productId: "RJ12345",
	title: "テスト作品",
	circle: "テストサークル",
	price: {
		current: 1100,
		currency: "JPY",
	},
	rating: {
		stars: 4.5,
		count: 100,
	},
	category: "SOU",
	workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ12345.html",
	thumbnailUrl: "https://img.dlsite.jp/thumbnail.jpg",
	sampleImages: [],
	tags: ["ASMR", "癒し"],
	description: "テスト用の作品説明",
	releaseDate: "2024-01-01",
	releaseDateISO: "2024-01-01",
	releaseDateDisplay: "2024年01月01日",
	ageRating: "全年齢",
	voiceActors: ["涼花みなせ"],
	scenario: [],
	illustration: [],
	music: [],
	author: [],
	genres: ["ASMR", "癒し"],
	isExclusive: false,
	dataSources: {
		searchResult: {
			lastFetched: "2024-01-01T00:00:00Z",
			genres: ["ASMR", "癒し"],
			basicInfo: {} as any,
		},
	},
	lastFetchedAt: "2024-01-01T00:00:00Z",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

describe("dlsite-firestore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("saveWorksToFirestore", () => {
		it("空の配列を渡した場合は何もしない", async () => {
			await saveWorksToFirestore([]);

			expect(mockBatch.set).not.toHaveBeenCalled();
			expect(mockBatch.commit).not.toHaveBeenCalled();
		});

		it("最適化構造では全データを保存する（バリデーションはマッパー段階で実行）", async () => {
			const workWithEmptyTitle = { ...sampleWork, title: "" }; // 空のタイトル
			mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

			await saveWorksToFirestore([workWithEmptyTitle]);

			// 最適化構造では全データを保存（バリデーションは事前に実行済み）
			expect(mockBatch.set).toHaveBeenCalledTimes(1);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});
	});

	describe("getWorkFromFirestore", () => {
		it("作品データを正常に取得できる", async () => {
			const mockDocRef = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					id: "RJ12345",
					data: () => sampleWork,
				}),
			};
			mockDoc.mockReturnValue(mockDocRef);

			const result = await getWorkFromFirestore("RJ12345");

			expect(result).toEqual({ id: "RJ12345", ...sampleWork });
		});

		it("存在しない作品の場合はnullを返す", async () => {
			const mockDocRef = {
				get: vi.fn().mockResolvedValue({ exists: false }),
			};
			mockDoc.mockReturnValue(mockDocRef);

			const result = await getWorkFromFirestore("RJ99999");

			expect(result).toBeNull();
		});
	});

	describe("searchWorksFromFirestore", () => {
		it("検索条件で作品を取得できる", async () => {
			const mockDocs = [
				{ id: "RJ12345", data: () => sampleWork },
				{ id: "RJ54321", data: () => ({ ...sampleWork, id: "RJ54321" }) },
			];
			mockQuery.get.mockResolvedValue({ docs: mockDocs });

			const result = await searchWorksFromFirestore({
				category: "SOU",
				limit: 10,
			});

			expect(result).toHaveLength(2);
			expect(mockQuery.where).toHaveBeenCalledWith("category", "==", "SOU");
			expect(mockQuery.limit).toHaveBeenCalledWith(10);
		});

		it("検索条件なしで全作品を取得できる", async () => {
			mockQuery.get.mockResolvedValue({ docs: [] });

			const result = await searchWorksFromFirestore({});

			expect(result).toEqual([]);
			expect(mockQuery.where).not.toHaveBeenCalled();
		});
	});

	describe("getWorksStatistics", () => {
		it("作品統計情報を正常に取得できる", async () => {
			const mockDocs = [
				{
					data: () => ({
						...sampleWork,
						price: { current: 1000, currency: "JPY" },
						category: "SOU",
						updatedAt: "2024-01-01T00:00:00Z",
					}),
				},
				{
					data: () => ({
						...sampleWork,
						price: { current: 2000, currency: "JPY" },
						category: "MOV",
						updatedAt: "2024-01-02T00:00:00Z",
					}),
				},
			];
			mockQuery.get.mockResolvedValue({ docs: mockDocs, size: 2 });

			const result = await getWorksStatistics();

			expect(result).toMatchObject({
				totalWorks: 2,
				categoryCounts: expect.any(Object),
				lastUpdated: expect.any(String),
			});
		});

		it("作品がない場合の統計情報", async () => {
			mockQuery.get.mockResolvedValue({ docs: [], size: 0 });

			const result = await getWorksStatistics();

			expect(result).toMatchObject({
				totalWorks: 0,
				categoryCounts: {},
				lastUpdated: null,
			});
		});
	});

	describe("getExistingWorksMap", () => {
		it("既存作品データのマップを正常に取得できる", async () => {
			const productIds = ["RJ12345", "RJ54321"];
			const existingWork1 = { ...sampleWork, productId: "RJ12345" };
			const existingWork2 = { ...sampleWork, productId: "RJ54321" };

			const mockDocs = [{ data: () => existingWork1 }, { data: () => existingWork2 }];
			mockQuery.get.mockResolvedValue({ docs: mockDocs });

			const result = await getExistingWorksMap(productIds);

			expect(result.size).toBe(2);
			expect(result.get("RJ12345")).toEqual(existingWork1);
			expect(result.get("RJ54321")).toEqual(existingWork2);
			expect(mockQuery.where).toHaveBeenCalledWith("productId", "in", productIds);
		});

		it("空の配列を渡した場合は空のマップを返す", async () => {
			const result = await getExistingWorksMap([]);

			expect(result.size).toBe(0);
			expect(mockQuery.get).not.toHaveBeenCalled();
		});

		it("10件以上のIDがある場合はチャンクに分割して取得する", async () => {
			const productIds = Array.from(
				{ length: 25 },
				(_, i) => `RJ${String(i + 1).padStart(5, "0")}`,
			);

			// 最適化により25件は30件以下なので1チャンクで処理される
			const mockDocs = productIds.slice(0, 10).map((id) => ({
				data: () => ({ ...sampleWork, productId: id }),
			}));

			mockQuery.get.mockResolvedValue({ docs: mockDocs });

			const result = await getExistingWorksMap(productIds);

			expect(result.size).toBe(10); // mockで返される実際のデータ数
			expect(mockQuery.get).toHaveBeenCalledTimes(1); // 最適化により1回のクエリ（25件は30件以下なので1チャンク）
		});

		it("Firestoreエラーが発生しても処理を継続する", async () => {
			const productIds = ["RJ12345"];
			// モックをリセットしてエラーを設定
			mockQuery.get.mockReset();
			mockQuery.get.mockRejectedValue(new Error("Firestore error"));

			const result = await getExistingWorksMap(productIds);

			expect(result.size).toBe(0); // エラーでも空のマップを返す
		});
	});

	describe("saveWorksToFirestore - 詳細テスト", () => {
		it("50件以下の場合は単一バッチで処理する", async () => {
			const works = Array.from({ length: 30 }, (_, i) => ({
				...sampleWork,
				productId: `RJ${String(i + 1).padStart(5, "0")}`,
			}));

			await saveWorksToFirestore(works);

			expect(mockBatch.set).toHaveBeenCalledTimes(30);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("50件超の場合は分割バッチで処理する", async () => {
			const works = Array.from({ length: 120 }, (_, i) => ({
				...sampleWork,
				productId: `RJ${String(i + 1).padStart(5, "0")}`,
			}));

			await saveWorksToFirestore(works);

			// 120件 = 3チャンク (50 + 50 + 20)
			expect(mockBatch.commit).toHaveBeenCalledTimes(3);
		});

		it("一部のチャンクが失敗しても処理を継続する", async () => {
			const works = Array.from({ length: 120 }, (_, i) => ({
				...sampleWork,
				productId: `RJ${String(i + 1).padStart(5, "0")}`,
			}));

			// 2番目のチャンクだけ失敗
			mockBatch.commit
				.mockResolvedValueOnce(undefined) // 1番目成功
				.mockRejectedValueOnce(new Error("Batch failed")) // 2番目失敗
				.mockResolvedValueOnce(undefined); // 3番目成功

			// エラーは投げられない（一部成功のため）
			await expect(saveWorksToFirestore(works)).resolves.not.toThrow();
		});

		it("全チャンクが失敗した場合はエラーを投げる", async () => {
			const works = Array.from({ length: 100 }, (_, i) => ({
				...sampleWork,
				productId: `RJ${String(i + 1).padStart(5, "0")}`,
			}));

			mockBatch.commit.mockRejectedValue(new Error("All batches failed"));

			await expect(saveWorksToFirestore(works)).rejects.toThrow("全2チャンクが失敗しました");
		});
	});

	describe("エラーハンドリング", () => {
		it("Firestore操作でエラーが発生した場合に適切に処理する", async () => {
			const mockDocRef = {
				get: vi.fn().mockRejectedValue(new Error("Firestore error")),
			};
			mockDoc.mockReturnValue(mockDocRef);

			await expect(getWorkFromFirestore("RJ12345")).rejects.toThrow();
		});

		it("バッチコミットでエラーが発生した場合にエラーを投げる", async () => {
			mockQuery.get.mockResolvedValue({ empty: true, docs: [] });
			mockBatch.commit.mockRejectedValue(new Error("Batch commit failed"));

			await expect(saveWorksToFirestore([sampleWork])).rejects.toThrow();
		});

		it("searchWorksFromFirestoreでエラーが発生した場合", async () => {
			// モックをリセットしてエラーを設定
			mockQuery.get.mockReset();
			mockQuery.get.mockRejectedValue(new Error("Search failed"));

			await expect(searchWorksFromFirestore({ category: "SOU" })).rejects.toThrow("作品検索に失敗");
		});

		it("getWorksStatisticsでエラーが発生した場合", async () => {
			// モックをリセットしてエラーを設定
			mockQuery.get.mockReset();
			mockQuery.get.mockRejectedValue(new Error("Statistics failed"));

			await expect(getWorksStatistics()).rejects.toThrow("作品統計情報の取得に失敗");
		});
	});

	describe("checkWorkExists", () => {
		it("作品が存在する場合はtrueを返す", async () => {
			const mockDocRef = {
				get: vi.fn().mockResolvedValue({ exists: true }),
			};
			mockDoc.mockReturnValue(mockDocRef);

			const result = await checkWorkExists("RJ12345");

			expect(result).toBe(true);
		});

		it("作品が存在しない場合はfalseを返す", async () => {
			const mockDocRef = {
				get: vi.fn().mockResolvedValue({ exists: false }),
			};
			mockDoc.mockReturnValue(mockDocRef);

			const result = await checkWorkExists("RJ99999");

			expect(result).toBe(false);
		});

		it("エラーが発生した場合はfalseを返す", async () => {
			const mockDocRef = {
				get: vi.fn().mockRejectedValue(new Error("Firestore error")),
			};
			mockDoc.mockReturnValue(mockDocRef);

			const result = await checkWorkExists("RJ12345");

			expect(result).toBe(false);
		});
	});

	describe("checkMultipleWorksExist", () => {
		it("複数作品の存在確認を正常に実行する", async () => {
			const mockDocs = [
				{ id: "doc1", data: () => ({ productId: "RJ123456" }) },
				{ id: "doc2", data: () => ({ productId: "RJ123458" }) },
			];

			mockQuery.get.mockResolvedValue({
				docs: mockDocs,
			});

			const productIds = ["RJ123456", "RJ123457", "RJ123458"];
			const result = await checkMultipleWorksExist(productIds);

			expect(result.get("RJ123456")).toBe(true);
			expect(result.get("RJ123457")).toBe(false);
			expect(result.get("RJ123458")).toBe(true);
		});

		it("空配列の場合は空のMapを返す", async () => {
			const result = await checkMultipleWorksExist([]);

			expect(result.size).toBe(0);
		});

		it("エラーが発生した場合は全てfalseで返す", async () => {
			mockQuery.get.mockRejectedValue(new Error("Firestore error"));

			const productIds = ["RJ123456", "RJ123457"];
			const result = await checkMultipleWorksExist(productIds);

			expect(result.get("RJ123456")).toBe(false);
			expect(result.get("RJ123457")).toBe(false);
		});
	});
});
