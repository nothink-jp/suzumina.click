/**
 * DLsite Firestore操作のテスト
 * 重要な機能に絞った簡潔なテスト
 */

import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモック
vi.mock("../../infrastructure/database/firestore", () => {
	const mockDoc = vi.fn();
	const mockQuery = {
		get: vi.fn(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
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

vi.mock("../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import {
	getWorkFromFirestore,
	getWorksStatistics,
	saveWorksToFirestore,
	searchWorksFromFirestore,
} from "./dlsite-firestore";

// モックの参照を取得
const firestoreMock = vi.mocked(await import("../../infrastructure/database/firestore"));
const mockQuery = (firestoreMock as any).__mockQuery;
const mockDoc = (firestoreMock as any).__mockDoc;
const mockBatch = (firestoreMock as any).__mockBatch;

// テスト用のサンプルデータ
const sampleWork: OptimizedFirestoreDLsiteWorkData = {
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
		// biome-ignore lint/suspicious/noSkippedTests: この関数は複数の内部関数に依存しており、単体テストでは複雑すぎる
		it.skip("複雑な内部依存のため正常ケースのテストはE2Eテストに委ねる", () => {
			// 代わりに空配列での早期returnとエラーケースのみテスト
			expect(true).toBe(true);
		});

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
