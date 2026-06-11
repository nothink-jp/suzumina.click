/**
 * Creator Firestore ユーティリティ関数のテスト
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../../../shared/logger";
import {
	getCreatorWorkCount,
	recomputeCreatorStats,
	removeCreatorMappings,
	updateCreatorWorkMapping,
} from "../creator-firestore";

// Firestoreモジュールのモック（モック定義より先に記述）
vi.mock("../../../infrastructure/database/firestore", () => {
	const Timestamp = {
		now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
	};

	const FieldValue = {
		serverTimestamp: () => "SERVER_TIMESTAMP",
		arrayUnion: (...elements: any[]) => ({ arrayUnion: elements }),
		arrayRemove: (...elements: any[]) => ({ arrayRemove: elements }),
		delete: () => ({ delete: true }),
	};

	return {
		default: {
			collection: vi.fn(),
			collectionGroup: vi.fn(),
			batch: vi.fn(),
		},
		Timestamp,
		FieldValue,
	};
});

// Firestoreモック関数（モック定義の後に記述）
const mockCollection = vi.fn();
const mockCollectionGroup = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockBatch = vi.fn();
const mockCommit = vi.fn();
const mockWhere = vi.fn();

// モックのリセット用関数
const resetMocks = () => {
	mockCollection.mockClear();
	mockCollectionGroup.mockClear();
	mockDoc.mockClear();
	mockGet.mockClear();
	mockSet.mockClear();
	mockUpdate.mockClear();
	mockDelete.mockClear();
	mockBatch.mockClear();
	mockCommit.mockClear();
	mockWhere.mockClear();
};

// ロガーのモック
vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

describe("creator-firestore", () => {
	beforeEach(async () => {
		// Firestoreのdefaultインスタンスのモックを設定
		const firestoreMock = await import("../../../infrastructure/database/firestore");
		firestoreMock.default.collection = mockCollection;
		firestoreMock.default.collectionGroup = mockCollectionGroup;
		firestoreMock.default.batch = mockBatch;

		// バッチモック
		mockBatch.mockReturnValue({
			set: mockSet,
			update: mockUpdate,
			delete: mockDelete,
			commit: mockCommit,
		});

		// コレクションモック
		mockCollection.mockReturnValue({
			doc: mockDoc,
			get: mockGet,
		});

		// ドキュメントモック
		mockDoc.mockImplementation(() => ({
			get: mockGet,
			set: mockSet,
			update: mockUpdate,
			delete: mockDelete,
			collection: mockCollection,
			ref: {
				collection: mockCollection,
			},
		}));

		// デフォルトのget応答
		mockGet.mockResolvedValue({
			exists: false,
			data: () => null,
			docs: [],
			size: 0,
			empty: true,
		});

		// コミット成功
		mockCommit.mockResolvedValue(undefined);
	});

	afterEach(() => {
		resetMocks();
		vi.clearAllMocks();
	});

	describe("updateCreatorWorkMapping", () => {
		it("新規クリエイターマッピングを作成する", async () => {
			const apiData: DLsiteApiResponse = {
				workno: "RJ123456",
				maker_id: "RG11111",
				maker_name: "テストサークル",
				creaters: {
					voice_by: [
						{ id: "VA001", name: "声優A" },
						{ id: "VA002", name: "声優B" },
					],
					illust_by: [{ id: "IL001", name: "イラストレーターA" }],
				},
			} as any;

			// Collection Group Queryのモック - 既存マッピングなし
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});
			mockGet.mockResolvedValueOnce({ docs: [] });

			// クリエイタードキュメントの存在チェック（全て新規）
			mockGet.mockResolvedValue({
				exists: false,
				data: () => null,
			});

			const result = await updateCreatorWorkMapping(apiData, "RJ123456");

			expect(result.success).toBe(true);
			expect(mockSet).toHaveBeenCalledTimes(6); // 3クリエイター × 2（基本情報 + 関連情報）
			expect(mockCommit).toHaveBeenCalledTimes(1);
		});

		it("既存マッピングを更新する", async () => {
			const apiData: DLsiteApiResponse = {
				workno: "RJ123456",
				maker_id: "RG11111",
				maker_name: "テストサークル",
				creaters: {
					voice_by: [{ id: "VA001", name: "声優A更新" }],
				},
			} as any;

			// Collection Group Queryのモック
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});

			// 既存マッピングの取得結果
			mockGet.mockResolvedValueOnce({
				docs: [
					{
						ref: { parent: { parent: { id: "VA001" } } },
						data: () => ({
							workId: "RJ123456",
							roles: ["voice"],
							circleId: "RG11111",
						}),
					},
				],
			});

			// クリエイタードキュメントの取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({ creatorId: "VA001", name: "声優A" }),
			});

			const result = await updateCreatorWorkMapping(apiData, "RJ123456");

			expect(result.success).toBe(true);
			expect(mockSet).toHaveBeenCalledTimes(2); // 基本情報 + 関連情報
		});

		it("無効なクリエイターIDはスキップする", async () => {
			const apiData: DLsiteApiResponse = {
				workno: "RJ123456",
				maker_id: "RG11111",
				maker_name: "テストサークル",
				creaters: {
					voice_by: [
						{ id: "", name: "無効ID" },
						{ id: "VA001", name: "有効ID" },
					],
				},
			} as any;

			// Collection Group Queryのモック - 既存マッピングなし
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});
			mockGet.mockResolvedValueOnce({ docs: [] });

			// クリエイタードキュメントの存在チェック
			mockGet.mockResolvedValue({
				exists: false,
				data: () => null,
			});

			const result = await updateCreatorWorkMapping(apiData, "RJ123456");

			expect(result.success).toBe(true);
			expect(mockSet).toHaveBeenCalledTimes(2); // 有効な1クリエイターのみ
		});

		it("エラーが発生した場合は失敗を返す", async () => {
			const apiData: DLsiteApiResponse = {
				workno: "RJ123456",
				maker_id: "RG11111",
				creaters: {
					voice_by: [{ id: "VA001", name: "声優A" }],
				},
			} as any;

			// Collection Group Queryのモック
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});
			mockGet.mockResolvedValueOnce({ docs: [] });

			// クリエイタードキュメントの存在チェック
			mockGet.mockResolvedValueOnce({
				exists: false,
				data: () => null,
			});

			mockCommit.mockRejectedValueOnce(new Error("Commit failed"));

			const result = await updateCreatorWorkMapping(apiData, "RJ123456");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Commit failed");
			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe("removeCreatorMappings", () => {
		it("作品のすべてのマッピングを削除する", async () => {
			// Collection Group Queryのモック
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});

			// 既存マッピング
			mockGet.mockResolvedValueOnce({
				docs: [
					{
						ref: { parent: { parent: { id: "VA001" } } },
						data: () => ({
							workId: "RJ123456",
							roles: ["voice"],
							circleId: "RG11111",
						}),
					},
					{
						ref: { parent: { parent: { id: "IL001" } } },
						data: () => ({
							workId: "RJ123456",
							roles: ["illustration"],
							circleId: "RG11111",
						}),
					},
				],
			});

			const count = await removeCreatorMappings("RJ123456");

			expect(count).toBe(2);
			expect(mockDelete).toHaveBeenCalledTimes(2);
			expect(mockCommit).toHaveBeenCalledTimes(1);
		});

		it("マッピングがない場合は0を返す", async () => {
			// Collection Group Queryのモック
			mockCollectionGroup.mockReturnValueOnce({
				where: mockWhere,
			});
			mockWhere.mockReturnValueOnce({
				get: mockGet,
			});

			mockGet.mockResolvedValueOnce({
				docs: [],
				empty: true,
			});

			const count = await removeCreatorMappings("RJ123456");

			expect(count).toBe(0);
			expect(mockDelete).not.toHaveBeenCalled();
			expect(mockCommit).not.toHaveBeenCalled();
		});
	});

	describe("getCreatorWorkCount", () => {
		it("クリエイターの作品数を取得する", async () => {
			mockGet.mockResolvedValueOnce({
				size: 5,
				docs: Array(5).fill({}),
			});

			const count = await getCreatorWorkCount("VA001");

			expect(count).toBe(5);
			expect(mockCollection).toHaveBeenCalledWith("creators");
			expect(mockDoc).toHaveBeenCalledWith("VA001");
		});

		it("エラー時は0を返す", async () => {
			mockGet.mockRejectedValueOnce(new Error("Get failed"));

			const count = await getCreatorWorkCount("VA001");

			expect(count).toBe(0);
			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe("recomputeCreatorStats", () => {
		it("works から workCount/types/primaryRole を計算して update する", async () => {
			mockGet.mockResolvedValueOnce({
				empty: false,
				size: 3,
				docs: [
					{ data: () => ({ workId: "RJ001", roles: ["voice"] }) },
					{ data: () => ({ workId: "RJ002", roles: ["voice", "other"] }) },
					{ data: () => ({ workId: "RJ003", roles: ["illustration"] }) },
				],
			});

			await recomputeCreatorStats("VA001");

			expect(mockUpdate).toHaveBeenCalledTimes(1);
			const updateArg = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
			expect(updateArg.workCount).toBe(3);
			expect(new Set(updateArg.types as string[])).toEqual(
				new Set(["voice", "other", "illustration"]),
			);
			expect(updateArg.primaryRole).toBe("voice");
		});

		it("works が空の場合は workCount=0, types=[] で update する", async () => {
			mockGet.mockResolvedValueOnce({
				empty: true,
				size: 0,
				docs: [],
			});

			await recomputeCreatorStats("VA001");

			expect(mockUpdate).toHaveBeenCalledTimes(1);
			const updateArg = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
			expect(updateArg.workCount).toBe(0);
			expect(updateArg.types).toEqual([]);
			expect(updateArg.primaryRole).toBeUndefined();
		});
	});
});
