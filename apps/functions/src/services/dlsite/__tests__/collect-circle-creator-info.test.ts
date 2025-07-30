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

// circle-firestoreモック
vi.mock("../circle-firestore", () => ({
	updateCircleWithWork: vi.fn().mockResolvedValue(true),
}));

// creator-firestoreモック
vi.mock("../creator-firestore", () => ({
	updateCreatorWorkMapping: vi.fn().mockResolvedValue({ success: true }),
}));

// テスト対象のインポート（モック設定後）
const { collectCircleAndCreatorInfo, batchCollectCircleAndCreatorInfo } = await import(
	"../collect-circle-creator-info"
);
const { updateCircleWithWork } = await import("../circle-firestore");
const { updateCreatorWorkMapping } = await import("../creator-firestore");

describe("collect-circle-creator-info", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// デフォルトで存在しないドキュメントを返す
		mockDoc.get.mockResolvedValue({ exists: false });
		// updateCreatorWorkMappingのデフォルトモックをリセット
		vi.mocked(updateCreatorWorkMapping).mockResolvedValue({ success: true });
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
			maker_name_en: "",
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

		it("updateCircleWithWorkを呼び出す", async () => {
			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData);

			expect(result.success).toBe(true);
			expect(updateCircleWithWork).toHaveBeenCalledWith(
				"RG12345",
				"RJ123456",
				"テストサークル",
				"",
			);
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(mockApiData, "RJ123456");
		});

		it("クリエイターマッピングを正しく作成する", async () => {
			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData);

			expect(result.success).toBe(true);
			// updateCreatorWorkMappingが正しいデータで呼ばれたことを確認
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(mockApiData, "RJ123456");
			expect(updateCreatorWorkMapping).toHaveBeenCalledTimes(1);
		});

		it("既存のクリエイターマッピングにタイプを追加する", async () => {
			// 新しい実装では、updateCreatorWorkMappingが複数の役割を内部で処理する
			const apiDataWithMultiRole: DLsiteRawApiResponse = {
				...mockApiData,
				creaters: {
					voice_by: [{ id: "creator1", name: "マルチクリエイター" }],
					illust_by: [{ id: "creator1", name: "マルチクリエイター" }],
				},
			} as any;

			const result = await collectCircleAndCreatorInfo(mockWorkData, apiDataWithMultiRole);

			expect(result.success).toBe(true);
			// updateCreatorWorkMappingが呼ばれたことを確認
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(apiDataWithMultiRole, "RJ123456");
			expect(updateCreatorWorkMapping).toHaveBeenCalledTimes(1);
		});

		it("無効なサークルIDの場合でも処理は継続する", async () => {
			const invalidApiData = {
				...mockApiData,
				maker_id: "INVALID_ID", // RGで始まらない
			};

			const result = await collectCircleAndCreatorInfo(mockWorkData, invalidApiData);

			expect(result.success).toBe(true);
			// サークル更新も呼ばれる（updateCircleWithWork内部で検証される）
			expect(updateCircleWithWork).toHaveBeenCalledWith(
				"INVALID_ID",
				"RJ123456",
				"テストサークル",
				"",
			);
			// クリエイターマッピングも呼ばれる
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(invalidApiData, "RJ123456");
		});

		it("エラー発生時は適切にハンドリングする", async () => {
			// updateCreatorWorkMappingでエラーを発生させる
			vi.mocked(updateCreatorWorkMapping).mockResolvedValueOnce({
				success: false,
				error: "Firestore error",
			});

			const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData);

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
				},
				{
					workData: { id: "RJ222222", title: "作品2" } as any,
					apiData: {
						maker_id: "RG22222",
						maker_name: "サークル2",
						workno: "RJ222222",
						creaters: { illust_by: [{ id: "i1", name: "イラスト1" }] },
					} as any,
				},
			];

			mockDoc.get.mockResolvedValue({ exists: false });

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.success).toBe(true);
			expect(result.processed).toBe(2);
			expect(result.errors).toHaveLength(0);
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

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.processed).toBe(150);
			// 各作品に対して一度ずつupdateCreatorWorkMappingが呼ばれる
			expect(updateCreatorWorkMapping).toHaveBeenCalledTimes(150);
		});

		it("バッチコミット失敗時はエラーを記録する", async () => {
			const works = [
				{
					workData: { id: "RJ333333", title: "作品3" } as any,
					apiData: { maker_id: "RG33333", maker_name: "サークル3", workno: "RJ333333" } as any,
				},
			];

			// updateCreatorWorkMappingでエラーを発生させる
			vi.mocked(updateCreatorWorkMapping).mockResolvedValueOnce({
				success: false,
				error: "Batch commit failed",
			});

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
					apiData: {
						maker_id: "RG44444",
						maker_name: "サークル4",
						maker_name_en: "",
						workno: "RJ444444",
					} as any,
				},
			];

			// updateCircleWithWorkでエラーを発生させる
			vi.mocked(updateCircleWithWork).mockRejectedValueOnce(new Error("Circle update error"));

			const result = await batchCollectCircleAndCreatorInfo(works);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].workId).toBe("RJ444444");
			expect(result.errors[0].error).toBe("Circle update error");
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
