/**
 * unified-data-processor.ts のテストスイート
 */

import type { DLsiteApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モックの設定
vi.mock("../dlsite-firestore", () => ({
	getWorkFromFirestore: vi.fn(),
	saveWorksToFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../circle-firestore", () => ({
	updateCircleWithWork: vi.fn().mockResolvedValue(true),
	removeWorkFromCircle: vi.fn().mockResolvedValue(true),
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
const { processUnifiedDLsiteData, processBatchUnifiedDLsiteData, detectChanges } = await import(
	"../unified-data-processor"
);
const { getWorkFromFirestore, saveWorksToFirestore } = await import("../dlsite-firestore");
const { removeWorkFromCircle, updateCircleWithWork } = await import("../circle-firestore");
const { updateCreatorWorkMapping } = await import("../creator-firestore");
const { savePriceHistory } = await import("../../price-history");
const { WorkMapper } = await import("../../mappers/work-mapper");

describe("unified-data-processor", () => {
	const mockApiData: DLsiteApiResponse = {
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

		it("既存作品で変更がない場合、価格履歴のみ更新する", async () => {
			vi.mocked(getWorkFromFirestore).mockResolvedValue(mockWorkData);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true);
			expect(result.workId).toBe("RJ123456");
			expect(result.updates).toEqual({
				work: false,
				circle: false,
				creators: false,
				priceHistory: true,
			});
			expect(result.errors).toHaveLength(0);

			// Work, Circle, Creator更新関数が呼ばれていないことを確認
			expect(saveWorksToFirestore).not.toHaveBeenCalled();
			expect(updateCircleWithWork).not.toHaveBeenCalled();
			expect(updateCreatorWorkMapping).not.toHaveBeenCalled();
			// 価格履歴は呼ばれていることを確認
			expect(savePriceHistory).toHaveBeenCalled();
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

		it("全ての主要更新が失敗した場合でも、価格履歴が成功すればsuccessがtrueになる", async () => {
			vi.mocked(saveWorksToFirestore).mockRejectedValue(new Error("Work failed"));
			vi.mocked(updateCircleWithWork).mockRejectedValue(new Error("Circle failed"));
			vi.mocked(updateCreatorWorkMapping).mockRejectedValue(new Error("Creator failed"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.success).toBe(true); // 価格履歴が成功しているのでtrue
			expect(result.updates).toEqual({
				work: false,
				circle: false,
				creators: false,
				priceHistory: true, // 価格履歴は成功
			});
			expect(result.errors).toHaveLength(3);
		});
	});

	describe("createdAt の維持（SPR-385）", () => {
		it("既存作品を書き込むときは既存の createdAt を維持する", async () => {
			const existingWork = {
				...mockWorkData,
				title: "旧タイトル",
				createdAt: "2025-01-01T00:00:00.000Z",
			};
			const updatedWork = { ...mockWorkData, createdAt: "2026-10-26T00:00:00.000Z" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			await processUnifiedDLsiteData(mockApiData);

			expect(saveWorksToFirestore).toHaveBeenCalledWith([
				expect.objectContaining({ title: "テスト作品", createdAt: "2025-01-01T00:00:00.000Z" }),
			]);
		});

		it("新規作品は mapper の createdAt で作成する", async () => {
			const newWork = { ...mockWorkData, createdAt: "2026-10-26T00:00:00.000Z" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(null);
			vi.mocked(WorkMapper.toWork).mockReturnValue(newWork);

			await processUnifiedDLsiteData(mockApiData);

			expect(saveWorksToFirestore).toHaveBeenCalledWith([
				expect.objectContaining({ createdAt: "2026-10-26T00:00:00.000Z" }),
			]);
		});

		it("既存作品に createdAt が無い古いデータなら mapper の値で埋める", async () => {
			const existingWork = { ...mockWorkData, title: "旧タイトル", createdAt: undefined } as any;
			const updatedWork = { ...mockWorkData, createdAt: "2026-10-26T00:00:00.000Z" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			await processUnifiedDLsiteData(mockApiData);

			expect(saveWorksToFirestore).toHaveBeenCalledWith([
				expect.objectContaining({ createdAt: "2026-10-26T00:00:00.000Z" }),
			]);
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
			expect(results[0]!.workId).toBe("RJ111111");
			expect(results[1]!.workId).toBe("RJ222222");
			expect(results[2]!.workId).toBe("RJ333333");
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
			expect(results[0]!.success).toBe(true);
			expect(results[1]!.success).toBe(false);
			expect(results[1]!.workId).toBe("RJ222222");
			expect(results[1]!.errors[0]).toContain("統合処理エラー: Mapping error");
		});
	});

	describe("変更検知による書き込み判定", () => {
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

		it("小幅な評価変更も検出する（SPR-346: 旧実装は星差 > 2 のみ）", async () => {
			const existingWork = {
				...mockWorkData,
				rating: { stars: 4.4, count: 100 },
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.work).toBe(true);
			expect(saveWorksToFirestore).toHaveBeenCalled();
		});

		it("評価件数のみの変化を検出する", async () => {
			const existingWork = {
				...mockWorkData,
				rating: { stars: 4.5, count: 99 },
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.work).toBe(true);
		});

		it("作者の変化では works / creators を書き込み、circles は同期しない", async () => {
			const existingWork = {
				...mockWorkData,
				creators: { voice_by: [{ id: "creator1", name: "声優A" }], illust_by: [] },
			} as any;
			const updatedWork = {
				...mockWorkData,
				creators: {
					voice_by: [{ id: "creator1", name: "声優A" }],
					illust_by: [{ id: "creator2", name: "イラストレーターB" }],
				},
			} as any;
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates).toMatchObject({ work: true, circle: false, creators: true });
			expect(updateCreatorWorkMapping).toHaveBeenCalledWith(mockApiData, "RJ123456");
			expect(updateCircleWithWork).not.toHaveBeenCalled();
		});

		it("評価だけの変化では works だけを書き込み、circles / creators は同期しない", async () => {
			const existingWork = { ...mockWorkData, rating: { stars: 4.5, count: 99 } };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates).toMatchObject({ work: true, circle: false, creators: false });
			expect(updateCircleWithWork).not.toHaveBeenCalled();
			expect(updateCreatorWorkMapping).not.toHaveBeenCalled();
		});

		it("サークル名の変化では circles を同期する", async () => {
			const existingWork = { ...mockWorkData, circle: "旧サークル名" };
			const updatedWork = { ...mockWorkData, circle: "新サークル名" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates).toMatchObject({ work: true, circle: true, creators: false });
		});

		it("サークルIDの変化では circles / creators の両方を同期する", async () => {
			const existingWork = { ...mockWorkData, circleId: "RG00000" };
			const updatedWork = { ...mockWorkData, circleId: "RG12345" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates).toMatchObject({ work: true, circle: true, creators: true });
			expect(updateCircleWithWork).toHaveBeenCalledWith(
				"RG12345",
				"RJ123456",
				"テストサークル",
				"Test Circle",
			);
			expect(removeWorkFromCircle).toHaveBeenCalledWith("RG00000", "RJ123456");
		});

		it("サークルIDが変わらなければ前のサークルから外す処理は呼ばない", async () => {
			const existingWork = { ...mockWorkData, circle: "旧サークル名", circleId: "RG12345" };
			const updatedWork = { ...mockWorkData, circle: "新サークル名", circleId: "RG12345" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			await processUnifiedDLsiteData(mockApiData);

			expect(updateCircleWithWork).toHaveBeenCalled();
			expect(removeWorkFromCircle).not.toHaveBeenCalled();
		});

		it("前のサークルからの除外だけが失敗したら、追加は成功扱いのまま除外エラーを記録する", async () => {
			const existingWork = { ...mockWorkData, circleId: "RG00000" };
			const updatedWork = { ...mockWorkData, circleId: "RG12345" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);
			vi.mocked(removeWorkFromCircle).mockRejectedValueOnce(new Error("UNAVAILABLE"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.circle).toBe(true);
			expect(result.errors).toContain("前サークルからの除外エラー: UNAVAILABLE");
		});

		it("maker_id が欠けて circleId が undefined になっても前のサークルから外さない（undefined は merge で既存値が残るため変化とみなさない）", async () => {
			const existingWork = { ...mockWorkData, circleId: "RG00000", circle: "サークル" };
			const updatedWork = { ...mockWorkData, circleId: undefined, circle: "Unknown Maker" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			await processUnifiedDLsiteData({ ...mockApiData, maker_id: undefined } as any);

			expect(removeWorkFromCircle).not.toHaveBeenCalled();
		});

		it("新しいサークルへの追加に失敗したら前のサークルから外さない", async () => {
			const existingWork = { ...mockWorkData, circleId: "RG00000" };
			const updatedWork = { ...mockWorkData, circleId: "RG12345" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);
			vi.mocked(updateCircleWithWork).mockRejectedValue(new Error("UNAVAILABLE"));

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.circle).toBe(false);
			expect(removeWorkFromCircle).not.toHaveBeenCalled();
		});

		it("説明の変化を検出する", async () => {
			const existingWork = { ...mockWorkData, description: "旧説明" };
			const updatedWork = { ...mockWorkData, description: "新説明" };
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.work).toBe(true);
			expect(saveWorksToFirestore).toHaveBeenCalledWith([updatedWork]);
		});

		it("取得時刻だけが違う場合は書き込まない", async () => {
			const existingWork = {
				...mockWorkData,
				lastFetchedAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};
			const updatedWork = {
				...mockWorkData,
				lastFetchedAt: "2026-10-26T00:00:00.000Z",
				updatedAt: "2026-10-26T00:00:00.000Z",
			};
			vi.mocked(getWorkFromFirestore).mockResolvedValue(existingWork);
			vi.mocked(WorkMapper.toWork).mockReturnValue(updatedWork);

			const result = await processUnifiedDLsiteData(mockApiData);

			expect(result.updates.work).toBe(false);
			expect(saveWorksToFirestore).not.toHaveBeenCalled();
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

	describe("detectChanges", () => {
		it("価格のみ変化した場合、price のパスだけを返す", () => {
			const existing = { ...mockWorkData, price: { ...mockWorkData.price, current: 800 } };

			expect(detectChanges(existing, mockWorkData)).toEqual(["price.current"]);
		});

		it("タイトルのみ変化した場合、title のパスだけを返す", () => {
			const existing = { ...mockWorkData, title: "旧タイトル" };

			expect(detectChanges(existing, mockWorkData)).toEqual(["title"]);
		});

		it("販売終了の変化を返す", () => {
			const existing = { ...mockWorkData, salesStatus: { isSale: true, isSoldOut: false } };
			const updated = { ...mockWorkData, salesStatus: { isSale: true, isSoldOut: true } };

			expect(detectChanges(existing, updated)).toEqual(["salesStatus.isSoldOut"]);
		});

		it("変化がない場合は空を返す", () => {
			expect(detectChanges(mockWorkData, mockWorkData)).toEqual([]);
		});

		it("ジャンルの削除を返す", () => {
			const existing = { ...mockWorkData, genres: ["ジャンル1", "ジャンル2"] };
			const updated = { ...mockWorkData, genres: ["ジャンル1"] };

			expect(detectChanges(existing, updated)).toEqual(["genres"]);
		});

		it("割引率のみの変化を返す（JPY価格は据え置き）", () => {
			const existing = { ...mockWorkData, price: { ...mockWorkData.price, discount: 10 } };
			const updated = { ...mockWorkData, price: { ...mockWorkData.price, discount: 30 } };

			expect(detectChanges(existing, updated)).toEqual(["price.discount"]);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
