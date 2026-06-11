/**
 * DLsite Firestore操作のテスト
 * 重要な機能に絞った簡潔なテスト
 */

import { FieldValue } from "@google-cloud/firestore";
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
	getExistingWorksMap,
	getWorkFromFirestore,
	saveWorksToFirestore,
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
	description: "テスト用の作品説明",
	releaseDate: "2024-01-01",
	releaseDateISO: "2024-01-01",
	releaseDateDisplay: "2024年01月01日",
	ageRating: "全年齢",
	genres: ["ASMR", "癒し"],
	customGenres: [],
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

		it("セール終了時（discount/original/point が不在）は FieldValue.delete() で旧値を消す", async () => {
			// merge 書き込み + ignoreUndefinedProperties では undefined はスキップされ古い割引が残る。
			// 不在の任意価格フィールドは明示削除されることを保証する（セール中表示が解除されない回帰の防止）。
			const workAfterSale: WorkDocument = {
				...sampleWork,
				price: { current: 1650, currency: "JPY" },
			};
			mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

			await saveWorksToFirestore([workAfterSale]);

			const payload = mockBatch.set.mock.calls[0]![1] as { price: Record<string, unknown> };
			expect((payload.price.discount as any).isEqual(FieldValue.delete())).toBe(true);
			expect((payload.price.original as any).isEqual(FieldValue.delete())).toBe(true);
			expect((payload.price.point as any).isEqual(FieldValue.delete())).toBe(true);
			expect(payload.price.current).toBe(1650);
		});

		it("セール中（discount/original あり）はその値を保持する", async () => {
			const workOnSale: WorkDocument = {
				...sampleWork,
				price: { current: 1320, original: 1650, discount: 20, currency: "JPY" },
			};
			mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

			await saveWorksToFirestore([workOnSale]);

			const payload = mockBatch.set.mock.calls[0]![1] as { price: Record<string, unknown> };
			expect(payload.price.discount).toBe(20);
			expect(payload.price.original).toBe(1650);
			expect(payload.price.current).toBe(1320);
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

			expect(result).toEqual({ ...sampleWork });
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
	});
});
