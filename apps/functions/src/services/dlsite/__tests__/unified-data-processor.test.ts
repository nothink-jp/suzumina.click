/**
 * unified-data-processor.ts のテストスイート
 */

import type { DLsiteRawApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モックの設定
vi.mock("../dlsite-firestore", () => ({
	getWorkFromFirestore: vi.fn(),
	saveWorksToFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../circle-firestore", () => ({
	updateCircleWithWork: vi.fn().mockResolvedValue(true),
}));

vi.mock("../creator-firestore", () => ({
	updateCreatorWorkMapping: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../price-history", () => ({
	savePriceHistory: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../mappers/work-mapper", () => ({
	WorkMapper: {
		toWork: vi.fn(),
	},
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

// インポート（モック設定後）
const { processUnifiedDLsiteData, processBatchUnifiedDLsiteData } = await import(
	"../unified-data-processor"
);
const { getWorkFromFirestore, saveWorksToFirestore } = await import("../dlsite-firestore");
const { updateCircleWithWork } = await import("../circle-firestore");
const { updateCreatorWorkMapping } = await import("../creator-firestore");
const { savePriceHistory } = await import("../../price-history");
const { WorkMapper } = await import("../../mappers/work-mapper");

describe("unified-data-processor", () => {
	const mockApiData: DLsiteRawApiResponse = {
		workno: "RJ123456",
		work_name: "テスト作品",
		maker_id: "RG12345",
		maker_name: "テストサークル",
		maker_name_en: "Test Circle",
		price: 1000,
		creaters: {
			voice_by: [{ id: "creator1", name: "声優A" }],
			illust_by: [{ id: "creator2", name: "イラストレーターB" }],
		},
	} as any;

	const mockWorkData: WorkDocument = {
		id: "RJ123456",
		productId: "RJ123456",
		title: "テスト作品",
		circle: {
			id: "RG12345",
			name: "テストサークル",
		},
		price: {
			current: 1000,
			base: 1000,
			discount: null,
		},
		salesStatus: {
			isSale: true,
			isSoldOut: false,
		},
		rating: {
			stars: 4.5,
			count: 100,
		},
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
		// デフォルトのモック動作を設定
		vi.mocked(WorkMapper.toWork).mockReturnValue(mockWorkData);
		vi.mocked(getWorkFromFirestore).mockResolvedValue(null);
		vi.mocked(saveWorksToFirestore).mockResolvedValue(undefined);
		vi.mocked(updateCircleWithWork).mockResolvedValue(true);
		vi.mocked(updateCreatorWorkMapping).mockResolvedValue({ success: true });
		vi.mocked(savePriceHistory).mockResolvedValue(true);
	});

	describe("processUnifiedDLsiteData", () => {
		it("新規作品の場合、全ての更新を実行する", async () => {
			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.workId).toBe("RJ123456");
			expect(result.updates).toEqual({
				work: true,
				circle: true,
				creators: true,
				priceHistory: true,
			});
			expect(result.errors).toHaveLength(0);

			// 各関数が呼ばれたことを確認
			expect(WorkMapper.toWork).toHaveBeenCalledWith(mockApiData);
			expect(saveWorksToFirestore).toHaveBeenCalledWith([mockWorkData]);
			expect(updateCircleWithWork).toHaveBeenCalledWith(
				"RG12345",
				"RJ123456",
				"テストサークル",
				"Test Circle",
			);
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(mockApiData, "RJ123456");
			expect(savePriceHistory).toHaveBeenCalledWith("RJ123456", mockApiData);
		});

		it("既存作品で変更がない場合、スキップする", async () => {
			vi.mocked(getWorkFromFirestore).mockResolvedValue(mockWorkData);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.workId).toBe("RJ123456");
			expect(result.updates).toEqual({
				work: false,
				circle: false,
				creators: false,
				priceHistory: false,
			});
			expect(result.errors).toHaveLength(0);

			// 更新関数が呼ばれていないことを確認
			expect(saveWorksToFirestore).not.toHaveBeenCalled();
			expect(updateCircleWithWork).not.toHaveBeenCalled();
			expect(updateCreatorWorkMapping).not.toHaveBeenCalled();
			expect(savePriceHistory).not.toHaveBeenCalled();
		});

		it("価格変更がある場合、更新を実行する", async () => {
			const existingWork = { ...mockWorkData, price: { ...mockWorkData.price, current: 800 } };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
			expect(result.updates.priceHistory).toBe(true);

			// 更新関数が呼ばれたことを確認
			expect(saveWorksToFirestore).toHaveBeenCalled();
			expect(savePriceHistory).toHaveBeenCalled();
		});

		it("forceUpdateオプションで強制更新する", async () => {
			vi.mocked(getWorkFromFirestore).mockResolvedValue(mockWorkData);

			const result = await processUnifiedDLsiteData(mockApiData, { forceUpdate: true });

			expect(result.success).toBe(true);
			expect(result.updates).toEqual({
				work: true,
				circle: true,
				creators: true,
				priceHistory: true,
			});

			// getWorkFromFirestoreが呼ばれていないことを確認
			expect(getWorkFromFirestore).not.toHaveBeenCalled();
		});

		it("skipPriceHistoryオプションで価格履歴をスキップする", async () => {
			const result = await processUnifiedDLsiteData(mockApiData, { skipPriceHistory: true });

			expect(result.success).toBe(true);
			expect(result.updates.priceHistory).toBe(false);
			expect(savePriceHistory).not.toHaveBeenCalled();
		});

		it("Work更新エラーを適切にハンドリングする", async () => {
			vi.mocked(saveWorksToFirestore).mockRejectedValue(new Error("Firestore error"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true); // 他の更新は成功
			expect(result.updates.work).toBe(false);
			expect(result.errors).toContain("Work更新エラー: Firestore error");
		});

		it("Circle更新エラーを適切にハンドリングする", async () => {
			vi.mocked(updateCircleWithWork).mockRejectedValue(new Error("Circle update failed"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true); // 他の更新は成功
			expect(result.updates.circle).toBe(false);
			expect(result.errors).toContain("Circle更新エラー: Circle update failed");
		});

		it("Creator更新エラーを適切にハンドリングする", async () => {
			vi.mocked(updateCreatorWorkMapping).mockResolvedValue({
				success: false,
				error: "Creator mapping failed",
			});

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true); // 他の更新は成功
			expect(result.updates.creators).toBe(false);
			expect(result.errors).toContain("Creator更新エラー: Creator mapping failed");
		});

		it("全ての主要更新が失敗した場合、successがfalseになる", async () => {
			vi.mocked(saveWorksToFirestore).mockRejectedValue(new Error("Work failed"));
			vi.mocked(updateCircleWithWork).mockRejectedValue(new Error("Circle failed"));
			vi.mocked(updateCreatorWorkMapping).mockRejectedValue(new Error("Creator failed"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(false);
			expect(result.updates).toEqual({
				work: false,
				circle: false,
				creators: false,
				priceHistory: true, // 価格履歴は成功
			});
			expect(result.errors).toHaveLength(3);
		});
	});

	describe("processBatchUnifiedDLsiteData", () => {
		it("複数のAPIデータをバッチ処理する", async () => {
			const apiDataList = [
				{ ...mockApiData, workno: "RJ111111" },
				{ ...mockApiData, workno: "RJ222222" },
				{ ...mockApiData, workno: "RJ333333" },
			];

			const results = await processBatchUnifiedDLsiteData(apiDataList);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.success)).toBe(true);
			expect(results[0].workId).toBe("RJ111111");
			expect(results[1].workId).toBe("RJ222222");
			expect(results[2].workId).toBe("RJ333333");
		});

		it("大量のデータを適切なバッチサイズで処理する", async () => {
			const apiDataList = Array.from({ length: 25 }, (_, i) => ({
				...mockApiData,
				workno: `RJ${String(i).padStart(6, "0")}`,
			}));

			const results = await processBatchUnifiedDLsiteData(apiDataList);

			expect(results).toHaveLength(25);
			// バッチサイズ10なので、3回に分けて処理される
			// モックの呼び出し回数を確認
			expect(WorkMapper.toWork).toHaveBeenCalledTimes(25);
		});

		it("バッチ内のエラーを適切にハンドリングする", async () => {
			const apiDataList = [
				{ ...mockApiData, workno: "RJ111111" },
				{ ...mockApiData, workno: "RJ222222" },
			];

			// 2番目の処理でエラーを発生させる
			vi.mocked(WorkMapper.toWork)
				.mockReturnValueOnce(mockWorkData)
				.mockImplementationOnce(() => {
					throw new Error("Mapping error");
				});

			const results = await processBatchUnifiedDLsiteData(apiDataList);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(false);
			expect(results[1].workId).toBe("RJ222222");
			expect(results[1].errors[0]).toContain("統合処理エラー: Mapping error");
		});
	});

	describe("hasSignificantChanges", () => {
		it("タイトル変更を検出する", async () => {
			const existingWork = { ...mockWorkData, title: "旧タイトル" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
		});

		it("販売状態変更を検出する", async () => {
			const existingWork = {
				...mockWorkData,
				salesStatus: { isSale: false, isSoldOut: false },
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
		});

		it("大幅な評価変更を検出する", async () => {
			const existingWork = {
				...mockWorkData,
				rating: { stars: 1.5, count: 100 }, // 4.5から1.5への変更（差が3）
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
		});

		it("小幅な評価変更は無視する", async () => {
			const existingWork = {
				...mockWorkData,
				rating: { stars: 4.0, count: 100 }, // 4.5から4.0への変更（差が0.5）
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(false);
		});

		it("販売終了を検出する", async () => {
			const existingWork = {
				...mockWorkData,
				salesStatus: { isSale: true, isSoldOut: false },
			};
			const updatedWork = {
				...mockWorkData,
				salesStatus: { isSale: true, isSoldOut: true },
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
		});

		it("新しいジャンルの追加を検出する", async () => {
			const existingWork = {
				...mockWorkData,
				genres: ["ジャンル1", "ジャンル2"],
			};
			const updatedWork = {
				...mockWorkData,
				genres: ["ジャンル1", "ジャンル2", "ジャンル3"],
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.updates.work).toBe(true);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
