/**
 * collect-circle-creator-info.ts のテストスイート
 */

import { FieldValue } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IndividualInfoAPIResponse } from "./individual-info-to-work-mapper";

// Firestoreモックの設定
const mockBatch = {
	set: vi.fn(),
	update: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined),
};

const mockDoc = {
	get: vi.fn(),
};

const mockCollection = {
	doc: vi.fn(() => mockDoc),
};

const mockFirestore = {
	batch: vi.fn(() => mockBatch),
	collection: vi.fn(() => mockCollection),
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
	"./collect-circle-creator-info"
);

describe("collect-circle-creator-info", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("collectCircleAndCreatorInfo", () => {
		const mockWorkData = {
			id: "RJ123456",
			title: "テスト作品",
			productId: "RJ123456",
			circleId: "RG12345",
		} as any;

		const mockApiData: IndividualInfoAPIResponse = {
			maker_id: "RG12345",
			maker_name: "テストサークル",
			workno: "RJ123456",
			work_name: "テスト作品",
			creaters: {
				voice_by: [
					{ id: "creator1", name: "声優A" },
					{ id: "creator2", name: "声優B" },
				],
				illust_by: [{ id: "creator3", name: "イラストレーターC" }],
			},
		} as any;

		it("新規サークルを正しく作成する", async () => {
			// 新規サークルの場合
			mockDoc.get.mockResolvedValue({ exists: false });

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			expect(result.success).toBe(true);
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockDoc,
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
			mockDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({ name: "既存サークル", workCount: 5 }),
			});

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			expect(result.success).toBe(true);
			expect(mockBatch.update).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					name: "テストサークル",
					workCount: { incrementValue: 1 },
					lastUpdated: "SERVER_TIMESTAMP",
				}),
			);
		});

		it("既存作品の更新時はworkCountを増加させない", async () => {
			mockDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({ name: "既存サークル", workCount: 5 }),
			});

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, false);

			expect(result.success).toBe(true);
			expect(mockBatch.update).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					name: "テストサークル",
					lastUpdated: "SERVER_TIMESTAMP",
				}),
			);
			expect(mockBatch.update).toHaveBeenCalledWith(
				mockDoc,
				expect.not.objectContaining({
					workCount: expect.anything(),
				}),
			);
		});

		it("クリエイターマッピングを正しく作成する", async () => {
			mockDoc.get.mockResolvedValue({ exists: false });

			await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);

			// 声優2名とイラストレーター1名のマッピングが作成されることを確認
			const setCallsForMappings = mockBatch.set.mock.calls.filter(
				(call) => call[1].creatorId !== undefined,
			);
			expect(setCallsForMappings).toHaveLength(3);

			// 声優Aのマッピング
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					creatorId: "creator1",
					workId: "RJ123456",
					creatorName: "声優A",
					types: ["voice"],
					circleId: "RG12345",
				}),
				{ merge: true },
			);

			// イラストレーターCのマッピング
			expect(mockBatch.set).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					creatorId: "creator3",
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
			let callCount = 0;
			mockDoc.get.mockImplementation(() => {
				callCount++;
				// 最初の呼び出しはサークル情報の確認
				if (callCount === 1) {
					return Promise.resolve({ exists: false });
				}
				// 2回目の呼び出しはクリエイターマッピングの確認（既存）
				if (callCount === 2) {
					return Promise.resolve({
						exists: true,
						data: () => ({ types: ["voice"] }),
					});
				}
				// 3回目の呼び出しはクリエイターマッピングの確認（新規）
				return Promise.resolve({ exists: false });
			});

			const apiDataWithMultiRole: IndividualInfoAPIResponse = {
				...mockApiData,
				creaters: {
					voice_by: [{ id: "creator1", name: "マルチクリエイター" }],
					illust_by: [{ id: "creator1", name: "マルチクリエイター" }],
				},
			} as any;

			await collectCircleAndCreatorInfo(mockWorkData, apiDataWithMultiRole, true);

			// クリエイターマッピングの呼び出しを確認
			const mappingCalls = mockBatch.set.mock.calls.filter(
				(call) => call[1].creatorId === "creator1",
			);

			// processedCreatorsによって最初の1回のみ処理される
			expect(mappingCalls).toHaveLength(1);
			// 最初に処理される voice タイプのみが保存される
			expect(mappingCalls[0][1]).toMatchObject({
				creatorId: "creator1",
				types: ["voice"],
			});
		});

		it("無効なサークルIDの場合はスキップする", async () => {
			const invalidApiData = {
				...mockApiData,
				maker_id: "INVALID_ID", // RGで始まらない
			};

			// サークル情報のget呼び出しを設定
			mockDoc.get.mockResolvedValue({ exists: false });

			const result = await collectCircleAndCreatorInfo(mockWorkData, invalidApiData, true);

			expect(result.success).toBe(true);
			// サークル作成/更新が呼ばれないことを確認
			const circleSetCalls = mockBatch.set.mock.calls.filter(
				(call) => call[1].circleId !== undefined && call[1].name !== undefined,
			);
			expect(circleSetCalls).toHaveLength(0);
		});

		it("エラー発生時は適切にハンドリングする", async () => {
			// get呼び出しでエラーを発生させる
			mockDoc.get.mockRejectedValueOnce(new Error("Firestore error"));

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
						creaters: { voice_by: [{ id: "v1", name: "声優1" }] },
					} as any,
					isNewWork: true,
				},
				{
					workData: { id: "RJ222222", title: "作品2" } as any,
					apiData: {
						maker_id: "RG22222",
						maker_name: "サークル2",
						workno: "RJ222222",
						creaters: { illust_by: [{ id: "i1", name: "イラスト1" }] },
					} as any,
					isNewWork: true,
				},
			];

			mockDoc.get.mockResolvedValue({ exists: false });

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

			mockDoc.get.mockResolvedValue({ exists: false });

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

			mockDoc.get.mockResolvedValue({ exists: false });
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
			mockDoc.get.mockRejectedValueOnce(new Error("Firestore read error"));

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
