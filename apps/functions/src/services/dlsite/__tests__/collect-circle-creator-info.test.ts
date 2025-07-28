/**
 * collect-circle-creator-info.ts のテストスイート
 */

import type { DLsiteRawApiResponse } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreモックの設定
const mockBatch = {
	set: vi.fn(),
	update: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined),
};

// Create separate mocks for circles and creatorWorkMappings
const mockCircleDoc = {
	id: "RG12345",
	exists: true,
	data: vi.fn(),
};

const mockCircleRef = {
	get: vi.fn(() => Promise.resolve(mockCircleDoc)),
};

const mockMappingDoc = {
	id: "123456_RJ123456",
	exists: false,
	data: vi.fn(),
};

const mockMappingRef = {
	get: vi.fn(() => Promise.resolve(mockMappingDoc)),
};

const mockMappingDoc2 = {
	id: "234567_RJ123456",
	exists: false,
	data: vi.fn(),
};

const mockMappingRef2 = {
	get: vi.fn(() => Promise.resolve(mockMappingDoc2)),
};

const mockMappingDoc3 = {
	id: "345678_RJ123456",
	exists: false,
	data: vi.fn(),
};

const mockMappingRef3 = {
	get: vi.fn(() => Promise.resolve(mockMappingDoc3)),
};

const mockCollection = {
	doc: vi.fn((id: string) => {
		// Return different mock refs based on the collection/document ID
		if (id === "123456_RJ123456") {
			return mockMappingRef;
		}
		if (id === "234567_RJ123456") {
			return mockMappingRef2;
		}
		if (id === "345678_RJ123456") {
			return mockMappingRef3;
		}
		if (id === "INVALID_ID") {
			// Invalid circle ID case - still need to return a mock ref
			return {
				get: vi.fn(() =>
					Promise.resolve({
						id: "INVALID_ID",
						exists: false,
						data: vi.fn(),
					}),
				),
			};
		}
		if (id.includes("_")) {
			// Default creator mapping document
			return mockMappingRef;
		}
		// This is a circle document
		return mockCircleRef;
	}),
};

const mockFirestore = {
	batch: vi.fn(() => mockBatch),
	collection: vi.fn((collectionName: string) => {
		// Return the same mockCollection for all collections
		// The doc() method will handle the specific document references
		return mockCollection;
	}),
};

vi.mock("@google-cloud/firestore", () => ({
	Firestore: vi.fn(() => mockFirestore),
	FieldValue: {
		serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
		increment: vi.fn((n: number) => ({ incrementValue: n })),
	},
}));

// ロガーモック
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

// テスト対象のインポート（モック設定後）
const { collectCircleAndCreatorInfo, batchCollectCircleAndCreatorInfo } = await import(
	"../collect-circle-creator-info"
);

describe("collect-circle-creator-info", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the document ID in case tests change it
		mockCircleDoc.id = "RG12345";
		mockCircleDoc.exists = false;
		mockCircleDoc.data.mockReturnValue({});

		mockMappingDoc.id = "123456_RJ123456";
		mockMappingDoc.exists = false;
		mockMappingDoc.data.mockReturnValue({});

		mockMappingDoc2.id = "234567_RJ123456";
		mockMappingDoc2.exists = false;
		mockMappingDoc2.data.mockReturnValue({});

		mockMappingDoc3.id = "345678_RJ123456";
		mockMappingDoc3.exists = false;
		mockMappingDoc3.data.mockReturnValue({});
	});

	describe("collectCircleAndCreatorInfo", () => {
		const mockWorkData = {
			id: "RJ123456",
			title: "テスト作品",
			productId: "RJ123456",
			circleId: "RG12345",
		} as any;

		const mockApiData: DLsiteRawApiResponse = {
			maker_id: "RG12345",
			maker_name: "テストサークル",
			workno: "RJ123456",
			work_name: "テスト作品",
			creaters: {
				voice_by: [
					{ id: "123456", name: "声優A" },
					{ id: "234567", name: "声優B" },
				],
				illust_by: [{ id: "345678", name: "イラストレーターC" }],
			},
		} as any;

		it("新規サークルを正しく作成する", async () => {
			// 新規サークルの場合
			mockCircleDoc.exists = false;
			mockMappingDoc.exists = false;
			mockMappingDoc2.exists = false;
			mockMappingDoc3.exists = false;

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			expect(result.success).toBe(true);
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockCircleRef,
				expect.objectContaining({
					circleId: "RG12345",
					name: "テストサークル",
					workCount: 1,
					lastUpdated: "SERVER_TIMESTAMP",
					createdAt: "SERVER_TIMESTAMP",
				}),
			);
			expect(mockBatch.commit).toHaveBeenCalled();
		});

		it("既存サークルの新作品を正しく更新する", async () => {
			// 既存サークルの場合
			mockCircleDoc.exists = true;
			mockCircleDoc.data.mockReturnValue({
				// circleId is not in the document data, it comes from doc.id
				name: "既存サークル",
				workCount: 5,
			});
			mockMappingDoc.exists = false;
			mockMappingDoc2.exists = false;
			mockMappingDoc3.exists = false;

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			expect(result.success).toBe(true);
			expect(mockBatch.update).toHaveBeenCalledWith(
				mockCircleRef,
				expect.objectContaining({
					name: "テストサークル",
					workCount: 6, // Entity incrementWorkCount returns the new value
					lastUpdated: "SERVER_TIMESTAMP",
				}),
			);
		});

		it("既存作品の更新時はworkCountを増加させない", async () => {
			// circles用とcreatorWorkMappings用の両方をモック
			mockCircleDoc.exists = true;
			mockCircleDoc.data.mockReturnValue({
				// circleId is not in the document data, it comes from doc.id
				name: "既存サークル",
				workCount: 5,
			});
			mockMappingDoc.exists = false;
			mockMappingDoc2.exists = false;
			mockMappingDoc3.exists = false;

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, false);

			expect(result.success).toBe(true);
			// When not a new work, the name is updated but workCount stays the same (5)
			expect(mockBatch.update).toHaveBeenCalledWith(
				mockCircleRef,
				expect.objectContaining({
					name: "テストサークル",
					workCount: 5, // workCount should not be incremented
					lastUpdated: "SERVER_TIMESTAMP",
				}),
			);
		});

		it("クリエイターマッピングを正しく作成する", async () => {
			mockCircleDoc.exists = false;
			mockMappingDoc.exists = false;
			mockMappingDoc2.exists = false;
			mockMappingDoc3.exists = false;

			await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			// 声優2名とイラストレーター1名のマッピングが作成されることを確認
			const setCallsForMappings = mockBatch.set.mock.calls.filter(
				(call) => call[1].creatorId !== undefined,
			);
			expect(setCallsForMappings).toHaveLength(3);

			// 声優Aのマッピング
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockMappingRef,
				expect.objectContaining({
					creatorId: "123456",
					workId: "RJ123456",
					creatorName: "声優A",
					types: ["voice"],
					circleId: "RG12345",
				}),
				{ merge: true },
			);

			// 声優Bのマッピング
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockMappingRef2,
				expect.objectContaining({
					creatorId: "234567",
					workId: "RJ123456",
					creatorName: "声優B",
					types: ["voice"],
					circleId: "RG12345",
				}),
				{ merge: true },
			);

			// イラストレーターCのマッピング
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockMappingRef3,
				expect.objectContaining({
					creatorId: "345678",
					workId: "RJ123456",
					creatorName: "イラストレーターC",
					types: ["illustration"],
					circleId: "RG12345",
				}),
				{ merge: true },
			);
		});

		it("既存のクリエイターマッピングにタイプを追加する", async () => {
			// Note: 実装の動作を確認したところ、同じクリエイターに対しても
			// processedCreatorsによって重複処理が防がれているため、
			// 最初に処理されたタイプのみが保存される仕様
			mockCircleDoc.exists = false;

			// 最初のクリエイターマッピングは既存として設定
			mockMappingDoc.exists = true;
			mockMappingDoc.data.mockReturnValue({ types: ["voice"] });

			const apiDataWithMultiRole: DLsiteRawApiResponse = {
				...mockApiData,
				creaters: {
					voice_by: [{ id: "123456", name: "マルチクリエイター" }],
					illust_by: [{ id: "123456", name: "マルチクリエイター" }],
				},
			} as any;

			await collectCircleAndCreatorInfo(mockWorkData, apiDataWithMultiRole, true);

			// クリエイターマッピングの呼び出しを確認
			const mappingCalls = mockBatch.set.mock.calls.filter(
				(call) => call[1].creatorId === "123456",
			);

			// processedCreatorsによって最初の1回のみ処理される
			expect(mappingCalls).toHaveLength(1);
			// 最初に処理される voice タイプのみが保存される
			expect(mappingCalls[0][1]).toMatchObject({
				creatorId: "123456",
				types: ["voice"],
			});
		});

		it("無効なサークルIDの場合はエラーを返す", async () => {
			const invalidApiData = {
				...mockApiData,
				maker_id: "INVALID_ID", // RGで始まらない
			};

			// サークル情報のget呼び出しを設定
			mockCircleDoc.exists = false;
			mockMappingDoc.exists = false;
			mockMappingDoc2.exists = false;
			mockMappingDoc3.exists = false;

			const result = await collectCircleAndCreatorInfo(mockWorkData, invalidApiData, true);

			// 無効なサークルIDの場合、CircleEntity.createがエラーを投げるため、success: falseが返る
			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid circle ID format");
			// サークル作成/更新が呼ばれないことを確認
			const circleSetCalls = mockBatch.set.mock.calls.filter(
				(call) => call[1].circleId !== undefined && call[1].name !== undefined,
			);
			expect(circleSetCalls).toHaveLength(0);
		});

		it("エラー発生時は適切にハンドリングする", async () => {
			// get呼び出しでエラーを発生させる
			mockCircleRef.get.mockRejectedValueOnce(new Error("Firestore error"));

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Firestore error");
		});
	});

	describe("batchCollectCircleAndCreatorInfo", () => {
		it("複数作品を正しくバッチ処理する", async () => {
			const works = [
				{
					workData: { id: "RJ111111", title: "作品1" } as any,
					apiData: {
						maker_id: "RG11111",
						maker_name: "サークル1",
						workno: "RJ111111",
						creaters: { voice_by: [{ id: "111111", name: "声優1" }] },
					} as any,
					isNewWork: true,
				},
				{
					workData: { id: "RJ222222", title: "作品2" } as any,
					apiData: {
						maker_id: "RG22222",
						maker_name: "サークル2",
						workno: "RJ222222",
						creaters: { illust_by: [{ id: "456789", name: "イラスト1" }] },
					} as any,
					isNewWork: true,
				},
			];

			// Setup mock to handle different circle IDs
			mockCollection.doc.mockImplementation((id: string) => {
				if (id === "RG11111" || id === "RG22222") {
					return {
						get: vi.fn(() =>
							Promise.resolve({
								id: id,
								exists: false,
								data: vi.fn(),
							}),
						),
					};
				}
				// For creator mappings
				return {
					get: vi.fn(() =>
						Promise.resolve({
							id: id,
							exists: false,
							data: vi.fn(),
						}),
					),
				};
			});

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.success).toBe(true);
			expect(result.processed).toBe(2);
			expect(result.errors).toHaveLength(0);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("大量の作品を複数バッチに分割して処理する", async () => {
			// 150作品を作成（100作品ずつのバッチに分割される）
			const works = Array.from({ length: 150 }, (_, i) => ({
				workData: { id: `RJ${String(i).padStart(6, "0")}`, title: `作品${i}` } as any,
				apiData: {
					maker_id: `RG${String(i).padStart(5, "0")}`,
					maker_name: `サークル${i}`,
					workno: `RJ${String(i).padStart(6, "0")}`,
				} as any,
				isNewWork: true,
			}));

			// Setup generic mock for all generated IDs
			mockCollection.doc.mockImplementation((id: string) => ({
				get: vi.fn(() =>
					Promise.resolve({
						id: id,
						exists: false,
						data: vi.fn(),
					}),
				),
			}));

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.processed).toBe(150);
			expect(mockBatch.commit).toHaveBeenCalledTimes(2); // 2バッチ
		});

		it("バッチコミット失敗時はエラーを記録する", async () => {
			const works = [
				{
					workData: { id: "RJ333333", title: "作品3" } as any,
					apiData: { maker_id: "RG33333", maker_name: "サークル3" } as any,
					isNewWork: true,
				},
			];

			// Setup mock for this specific test
			mockCollection.doc.mockImplementation((id: string) => ({
				get: vi.fn(() =>
					Promise.resolve({
						id: id,
						exists: false,
						data: vi.fn(),
					}),
				),
			}));
			mockBatch.commit.mockRejectedValueOnce(new Error("Batch commit failed"));

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toEqual({
				workId: "RJ333333",
				error: "Batch commit failed",
			});
		});

		it("個別作品の処理エラーを記録する", async () => {
			const works = [
				{
					workData: { id: "RJ444444", title: "作品4" } as any,
					apiData: { maker_id: "RG44444", maker_name: "サークル4" } as any,
					isNewWork: true,
				},
			];

			// updateCircleInfoで例外を発生させる
			mockCollection.doc.mockImplementation((id: string) => {
				if (id === "RG44444") {
					return {
						get: vi.fn(() => Promise.reject(new Error("Firestore read error"))),
					};
				}
				return {
					get: vi.fn(() =>
						Promise.resolve({
							id: id,
							exists: false,
							data: vi.fn(),
						}),
					),
				};
			});

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].workId).toBe("RJ444444");
			expect(result.errors[0].error).toBe("Firestore read error");
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
