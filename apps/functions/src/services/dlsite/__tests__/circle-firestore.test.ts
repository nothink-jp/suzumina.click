/**
 * Circle Firestore ユーティリティ関数のテスト
 */

import { Timestamp } from "@google-cloud/firestore";
import type { CircleDocument } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import firestore from "../../../infrastructure/database/firestore";
import * as logger from "../../../shared/logger";
import {
	getCirclesByIds,
	getCircleWorkCount,
	recalculateCircleWorkIds,
	removeWorkFromCircle,
	updateCircleWithWork,
} from "../circle-firestore";

// モックの設定
vi.mock("../../../infrastructure/database/firestore", () => ({
	default: {
		collection: vi.fn(),
	},
	FieldValue: {
		arrayUnion: vi.fn((value) => ({ arrayUnion: value })),
		arrayRemove: vi.fn((value) => ({ arrayRemove: value })),
		delete: vi.fn(() => ({ delete: undefined })),
	},
	Timestamp: {
		now: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
	},
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

describe("circle-firestore", () => {
	const mockDoc = vi.fn();
	const mockGet = vi.fn();
	const mockSet = vi.fn();
	const mockUpdate = vi.fn();
	const mockWhere = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Firestoreモックチェーンの設定
		(firestore.collection as any).mockReturnValue({
			doc: mockDoc,
			where: mockWhere,
		});

		mockDoc.mockReturnValue({
			get: mockGet,
			set: mockSet,
			update: mockUpdate,
		});

		mockWhere.mockReturnValue({
			get: mockGet,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("updateCircleWithWork", () => {
		it("新規サークルを作成できる", async () => {
			mockGet.mockResolvedValue({ exists: false });

			const result = await updateCircleWithWork(
				"RG01234",
				"RJ123456",
				"テストサークル",
				"Test Circle",
			);

			expect(result).toBe(true);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					circleId: "RG01234",
					name: "テストサークル",
					nameEn: "Test Circle",
					workIds: ["RJ123456"],
				}),
			);
		});

		it("既存サークルに作品を追加できる", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111", "RJ222222"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await updateCircleWithWork("RG01234", "RJ333333", "テストサークル", "");

			expect(result).toBe(true);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					workIds: { arrayUnion: "RJ333333" },
				}),
			);
		});

		it("既存作品の重複追加を防ぐ", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ123456"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await updateCircleWithWork("RG01234", "RJ123456", "テストサークル", "");

			expect(result).toBe(false);
			expect(mockUpdate).not.toHaveBeenCalled();
		});

		it("workIdsがない既存サークルを初期化できる", async () => {
			const existingCircle = {
				circleId: "RG01234",
				name: "テストサークル",
				workCount: 5, // 古いworkCountフィールド
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await updateCircleWithWork("RG01234", "RJ123456", "テストサークル", "");

			expect(result).toBe(true);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					workIds: ["RJ123456"],
				}),
			);
		});

		it("サークル名の更新ができる", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "旧サークル名",
				workIds: ["RJ123456"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await updateCircleWithWork(
				"RG01234",
				"RJ123456",
				"新サークル名",
				"New Circle Name",
			);

			expect(result).toBe(true);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "新サークル名",
					nameEn: "New Circle Name",
				}),
			);
		});

		it("エラー時は例外を投げる", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			await expect(
				updateCircleWithWork("RG01234", "RJ123456", "テストサークル", ""),
			).rejects.toThrow("Firestore error");

			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe("removeWorkFromCircle", () => {
		it("サークルから作品を削除できる", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111", "RJ222222", "RJ333333"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await removeWorkFromCircle("RG01234", "RJ222222");

			expect(result).toBe(true);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					workIds: { arrayRemove: "RJ222222" },
				}),
			);
		});

		it("存在しないサークルの場合はfalseを返す", async () => {
			mockGet.mockResolvedValue({ exists: false });

			const result = await removeWorkFromCircle("RG99999", "RJ123456");

			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith("サークルが存在しません: RG99999");
		});

		it("存在しない作品の削除を試みた場合はfalseを返す", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const result = await removeWorkFromCircle("RG01234", "RJ999999");

			expect(result).toBe(false);
			expect(mockUpdate).not.toHaveBeenCalled();
		});
	});

	describe("getCircleWorkCount", () => {
		it("サークルの作品数を正しく取得できる", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111", "RJ222222", "RJ333333"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => existingCircle,
			});

			const count = await getCircleWorkCount("RG01234");

			expect(count).toBe(3);
		});

		it("存在しないサークルの場合は0を返す", async () => {
			mockGet.mockResolvedValue({ exists: false });

			const count = await getCircleWorkCount("RG99999");

			expect(count).toBe(0);
		});

		it("workIdsがundefinedの場合は0を返す", async () => {
			const circleWithoutWorkIds = {
				circleId: "RG01234",
				name: "テストサークル",
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			mockGet.mockResolvedValue({
				exists: true,
				data: () => circleWithoutWorkIds,
			});

			const count = await getCircleWorkCount("RG01234");

			expect(count).toBe(0);
		});
	});

	describe("getCirclesByIds", () => {
		it("複数のサークルを一括取得できる", async () => {
			const circle1: CircleDocument = {
				circleId: "RG01234",
				name: "サークル1",
				nameEn: "",
				workIds: ["RJ111111"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			const circle2: CircleDocument = {
				circleId: "RG01235",
				name: "サークル2",
				nameEn: "",
				workIds: ["RJ222222"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			const mockSnapshot = {
				forEach: vi.fn((callback) => {
					callback({ data: () => circle1 });
					callback({ data: () => circle2 });
				}),
			};

			mockGet.mockResolvedValue(mockSnapshot);

			const result = await getCirclesByIds(["RG01234", "RG01235"]);

			expect(result.size).toBe(2);
			expect(result.get("RG01234")).toEqual(circle1);
			expect(result.get("RG01235")).toEqual(circle2);
		});

		it("空配列の場合は空のMapを返す", async () => {
			const result = await getCirclesByIds([]);

			expect(result.size).toBe(0);
			expect(mockWhere).not.toHaveBeenCalled();
		});

		it("10個以上のIDはバッチ処理される", async () => {
			const circleIds = Array.from({ length: 25 }, (_, i) => `RG${i.toString().padStart(5, "0")}`);

			const mockSnapshot = {
				forEach: vi.fn(),
			};

			mockGet.mockResolvedValue(mockSnapshot);

			await getCirclesByIds(circleIds);

			// whereInの制限により3回呼ばれる（10 + 10 + 5）
			expect(mockWhere).toHaveBeenCalledTimes(3);
		});
	});

	describe("recalculateCircleWorkIds", () => {
		it("サークルのworkIdsを正しく再集計できる", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111", "RJ999999"], // RJ999999は存在しない
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			const actualWorks = [{ id: "RJ111111" }, { id: "RJ222222" }, { id: "RJ333333" }];

			const worksSnapshot = {
				docs: actualWorks.map((work) => ({ id: work.id })),
			};

			// worksコレクションのクエリ
			const worksQuery = {
				get: vi.fn().mockResolvedValue(worksSnapshot),
			};

			mockWhere.mockReturnValueOnce(worksQuery);

			// circlesコレクションのドキュメント取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => existingCircle,
			});

			const result = await recalculateCircleWorkIds("RG01234");

			expect(result).toBe(3);
			expect(mockUpdate).toHaveBeenCalledWith({
				workIds: ["RJ111111", "RJ222222", "RJ333333"],
				updatedAt: expect.any(Object),
			});
		});

		it("サークルが存在しない場合は0を返す", async () => {
			const worksSnapshot = {
				docs: [{ id: "RJ111111" }],
			};

			const worksQuery = {
				get: vi.fn().mockResolvedValue(worksSnapshot),
			};

			mockWhere.mockReturnValueOnce(worksQuery);
			mockGet.mockResolvedValueOnce({ exists: false });

			const result = await recalculateCircleWorkIds("RG99999");

			expect(result).toBe(0);
			expect(logger.warn).toHaveBeenCalledWith("再集計対象のサークルが存在しません: RG99999");
		});

		it("差分がない場合は更新しない", async () => {
			const existingCircle: CircleDocument = {
				circleId: "RG01234",
				name: "テストサークル",
				nameEn: "",
				workIds: ["RJ111111", "RJ222222"],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};

			const actualWorks = [{ id: "RJ111111" }, { id: "RJ222222" }];

			const worksSnapshot = {
				docs: actualWorks.map((work) => ({ id: work.id })),
			};

			const worksQuery = {
				get: vi.fn().mockResolvedValue(worksSnapshot),
			};

			mockWhere.mockReturnValueOnce(worksQuery);
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => existingCircle,
			});

			const result = await recalculateCircleWorkIds("RG01234");

			expect(result).toBe(2);
			expect(mockUpdate).not.toHaveBeenCalled();
		});
	});
});
