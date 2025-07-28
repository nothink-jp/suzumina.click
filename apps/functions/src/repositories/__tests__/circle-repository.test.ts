/**
 * CircleRepository テストスイート
 */

import type { CircleData } from "@suzumina.click/shared-types";
import { CircleEntity } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreモックの設定
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

const mockDoc = {
	get: mockGet,
	set: mockSet,
};

const mockCollection = {
	doc: vi.fn(() => mockDoc),
	where: mockWhere,
	orderBy: mockOrderBy,
	limit: mockLimit,
	get: mockGet,
};

const mockFirestore = {
	collection: vi.fn(() => mockCollection),
};

// クエリチェーンのモック設定
mockWhere.mockReturnValue({
	get: mockGet,
});
mockOrderBy.mockReturnValue({
	limit: mockLimit,
});
mockLimit.mockReturnValue({
	get: mockGet,
});

vi.mock("@google-cloud/firestore", () => ({
	Firestore: vi.fn(() => mockFirestore),
	FieldValue: {
		serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
	},
}));

// ロガーモック
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

// CircleEntity モック
vi.mock("@suzumina.click/shared-types", async () => {
	const actual = await vi.importActual("@suzumina.click/shared-types");
	return {
		...actual,
		isValidCircleId: vi.fn((id: string) => id.startsWith("RG")),
	};
});

// テスト対象のインポート
import { CircleRepository } from "../circle-repository";

describe("CircleRepository", () => {
	let repository: CircleRepository;

	const mockCircleData: CircleData = {
		circleId: "RG12345",
		name: "テストサークル",
		nameEn: "Test Circle",
		workCount: 10,
		createdAt: new Date("2024-01-01"),
		lastUpdated: new Date("2025-01-01"),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new CircleRepository(mockFirestore as any);
	});

	describe("findById", () => {
		it("存在するサークルを正しく取得する", async () => {
			mockGet.mockResolvedValueOnce({
				exists: true,
				id: "RG12345",
				data: () => mockCircleData,
			});

			const result = await repository.findById("RG12345");

			expect(result).not.toBeNull();
			expect(result?.circleId).toBe("RG12345");
			expect(result?.circleName).toBe("テストサークル");
			expect(mockCollection.doc).toHaveBeenCalledWith("RG12345");
		});

		it("存在しないサークルの場合はnullを返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await repository.findById("RG99999");

			expect(result).toBeNull();
		});

		it("無効なIDの場合はnullを返す", async () => {
			const result = await repository.findById("INVALID");

			expect(result).toBeNull();
			expect(mockGet).not.toHaveBeenCalled();
		});
	});

	describe("findByIdAsPlainObject", () => {
		it("PlainObjectとして取得する", async () => {
			mockGet.mockResolvedValueOnce({
				exists: true,
				id: "RG12345",
				data: () => mockCircleData,
			});

			const result = await repository.findByIdAsPlainObject("RG12345");

			expect(result).not.toBeNull();
			expect(result?.id).toBe("RG12345");
			expect(result?.name).toBe("テストサークル");
			expect(result?.isActive).toBeDefined();
		});
	});

	describe("save", () => {
		it("Entityを正しく保存する", async () => {
			mockSet.mockResolvedValueOnce(undefined);

			const entity = CircleEntity.fromFirestoreData(mockCircleData);
			const result = await repository.save(entity);

			expect(result).toBe(true);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					circleId: "RG12345",
					name: "テストサークル",
					workCount: 10,
					lastUpdated: "SERVER_TIMESTAMP",
				}),
				{ merge: true },
			);
		});

		it("保存に失敗した場合はfalseを返す", async () => {
			mockSet.mockRejectedValueOnce(new Error("Save failed"));

			const entity = CircleEntity.fromFirestoreData(mockCircleData);
			const result = await repository.save(entity);

			expect(result).toBe(false);
		});
	});

	describe("create", () => {
		it("新規サークルを作成する", async () => {
			// 既存チェック
			mockGet.mockResolvedValueOnce({
				exists: false,
			});
			// 作成
			mockSet.mockResolvedValueOnce(undefined);

			const result = await repository.create("RG54321", "新規サークル", "New Circle");

			expect(result).not.toBeNull();
			expect(result?.circleId).toBe("RG54321");
			expect(result?.circleName).toBe("新規サークル");
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					circleId: "RG54321",
					name: "新規サークル",
					nameEn: "New Circle",
					workCount: 0,
				}),
			);
		});

		it("既に存在する場合は既存のサークルを返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: true,
				id: "RG12345",
				data: () => mockCircleData,
			});

			const result = await repository.create("RG12345", "新規サークル");

			expect(result).not.toBeNull();
			expect(result?.circleName).toBe("テストサークル"); // 既存の名前
			expect(mockSet).not.toHaveBeenCalled();
		});
	});

	describe("incrementWorkCount", () => {
		it("作品数を増加させる", async () => {
			// findById
			mockGet.mockResolvedValueOnce({
				exists: true,
				id: "RG12345",
				data: () => mockCircleData,
			});
			// save
			mockSet.mockResolvedValueOnce(undefined);

			const result = await repository.incrementWorkCount("RG12345");

			expect(result).toBe(true);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					workCount: 11, // 10 + 1
				}),
				{ merge: true },
			);
		});

		it("サークルが存在しない場合はfalseを返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await repository.incrementWorkCount("RG99999");

			expect(result).toBe(false);
			expect(mockSet).not.toHaveBeenCalled();
		});
	});

	describe("findByIds", () => {
		it("複数のサークルを一括取得する", async () => {
			const mockSnapshot = {
				docs: [
					{
						id: "RG12345",
						data: () => mockCircleData,
					},
					{
						id: "RG54321",
						data: () => ({
							...mockCircleData,
							circleId: "RG54321",
							name: "別のサークル",
						}),
					},
				],
			};
			mockGet.mockResolvedValueOnce(mockSnapshot);

			const result = await repository.findByIds(["RG12345", "RG54321"]);

			expect(result).toHaveLength(2);
			expect(result[0].circleId).toBe("RG12345");
			expect(result[1].circleId).toBe("RG54321");
			expect(mockWhere).toHaveBeenCalledWith("circleId", "in", ["RG12345", "RG54321"]);
		});

		it("無効なIDはフィルタリングする", async () => {
			const mockSnapshot = { docs: [] };
			mockGet.mockResolvedValueOnce(mockSnapshot);

			const result = await repository.findByIds(["INVALID", "RG12345", "WRONG"]);

			expect(mockWhere).toHaveBeenCalledWith("circleId", "in", ["RG12345"]);
		});
	});

	describe("findTopCircles", () => {
		it("トップサークルを取得する", async () => {
			const mockSnapshot = {
				docs: [
					{
						id: "RG12345",
						data: () => ({ ...mockCircleData, workCount: 100 }),
					},
					{
						id: "RG54321",
						data: () => ({ ...mockCircleData, circleId: "RG54321", workCount: 50 }),
					},
				],
			};
			mockGet.mockResolvedValueOnce(mockSnapshot);

			const result = await repository.findTopCircles(10);

			expect(result).toHaveLength(2);
			expect(result[0].workCountNumber).toBe(100);
			expect(result[1].workCountNumber).toBe(50);
			expect(mockOrderBy).toHaveBeenCalledWith("workCount", "desc");
			expect(mockLimit).toHaveBeenCalledWith(10);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
