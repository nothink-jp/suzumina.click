/**
 * Circle Firestore ユーティリティ関数のテスト
 */

import { Timestamp } from "@google-cloud/firestore";
import type { CircleDocument } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import firestore from "../../../infrastructure/database/firestore";
import * as logger from "../../../shared/logger";
import { updateCircleWithWork } from "../circle-firestore";

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
});
