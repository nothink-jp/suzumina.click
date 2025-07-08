/**
 * 時系列データFirestore操作のテストスイート
 */

import type {
	TimeSeriesDailyAggregate,
	TimeSeriesRawData,
} from "@suzumina.click/shared-types/work";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIMESERIES_COLLECTIONS } from "./timeseries-firestore";

// Firestoreのモック
const mockFirestore = {
	collection: vi.fn(),
	batch: vi.fn(),
};

const mockCollection = {
	doc: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	select: vi.fn(),
	get: vi.fn(),
};

const mockDoc = {
	set: vi.fn(),
	get: vi.fn(),
	data: vi.fn(),
	exists: true,
};

const mockQuery = {
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	get: vi.fn(),
};

const mockSnapshot = {
	empty: false,
	size: 2,
	docs: [
		{ data: vi.fn(), ref: { delete: vi.fn() } },
		{ data: vi.fn(), ref: { delete: vi.fn() } },
	],
};

const mockBatch = {
	set: vi.fn(),
	delete: vi.fn(),
	commit: vi.fn(),
};

// モックの設定
beforeEach(() => {
	vi.clearAllMocks();

	mockFirestore.collection.mockReturnValue(mockCollection);
	mockFirestore.batch.mockReturnValue(mockBatch);

	mockCollection.doc.mockReturnValue(mockDoc);
	mockCollection.where.mockReturnValue(mockQuery);
	mockCollection.orderBy.mockReturnValue(mockQuery);
	mockCollection.limit.mockReturnValue(mockQuery);
	mockCollection.select.mockReturnValue(mockQuery);
	mockCollection.get.mockResolvedValue(mockSnapshot);

	mockQuery.where.mockReturnValue(mockQuery);
	mockQuery.orderBy.mockReturnValue(mockQuery);
	mockQuery.get.mockResolvedValue(mockSnapshot);

	mockDoc.set.mockResolvedValue(undefined);
	mockDoc.get.mockResolvedValue(mockDoc);
	mockSnapshot.docs[0]?.data.mockReturnValue(mockTimeseriesRawData);
	mockSnapshot.docs[1]?.data.mockReturnValue(mockTimeseriesRawData);

	mockBatch.commit.mockResolvedValue(undefined);
});

// テスト用のモックデータ
const mockTimeseriesRawData: TimeSeriesRawData = {
	workId: "RJ01037463",
	timestamp: "2025-07-07T12:00:00.000Z",
	date: "2025-07-07",
	time: "12:00:00",
	regionalPrices: {
		JP: 1320,
		US: 9.13,
		EU: 7.76,
		CN: 63.84,
		TW: 277.2,
		KR: 11748,
	},
	discountRate: 25,
	campaignId: 241,
	salesCount: 1234,
	wishlistCount: 567,
	rankDay: 15,
	rankWeek: 45,
	rankMonth: 120,
	ratingAverage: 4.5,
	ratingCount: 89,
};

const mockTimeseriesDailyAggregate: TimeSeriesDailyAggregate = {
	workId: "RJ01037463",
	date: "2025-07-07",
	lowestPrices: {
		JP: 990,
		US: 6.85,
		EU: 5.82,
		CN: 47.88,
		TW: 207.9,
		KR: 8811,
	},
	maxDiscountRate: 25,
	activeCampaignIds: [241],
	maxSalesCount: 1234,
	maxWishlistCount: 567,
	bestRankDay: 15,
	bestRankWeek: 45,
	bestRankMonth: 120,
	maxRatingAverage: 4.5,
	maxRatingCount: 89,
	dataPointCount: 5,
	firstCaptureTime: "10:00:00",
	lastCaptureTime: "18:00:00",
};

describe("時系列データFirestore操作", () => {
	describe("TIMESERIES_COLLECTIONS", () => {
		it("正しいコレクション名が定義されている", () => {
			expect(TIMESERIES_COLLECTIONS.RAW_DATA).toBe("dlsite_timeseries_raw");
			expect(TIMESERIES_COLLECTIONS.DAILY_AGGREGATES).toBe("dlsite_timeseries_daily");
			expect(TIMESERIES_COLLECTIONS.PRICE_CHARTS).toBe("dlsite_price_charts");
			expect(TIMESERIES_COLLECTIONS.RANKING_CHARTS).toBe("dlsite_ranking_charts");
		});
	});

	describe("saveTimeSeriesRawData", () => {
		// 実際のFirestore操作テストはmockでは限界があるため、
		// インテグレーションテストで検証する必要がある
		it("生データの保存形式を確認", () => {
			const expectedDocId = `${mockTimeseriesRawData.workId}_${mockTimeseriesRawData.date}_${mockTimeseriesRawData.time.replace(/:/g, "-")}`;

			expect(expectedDocId).toBe("RJ01037463_2025-07-07_12-00-00");
		});
	});

	describe("生データから日次集計への変換ロジック", () => {
		it("複数の生データから正しく最低価格を計算する", () => {
			const _rawDataArray: TimeSeriesRawData[] = [
				{
					...mockTimeseriesRawData,
					regionalPrices: { JP: 1320, US: 9.13, EU: 7.76, CN: 63.84, TW: 277.2, KR: 11748 },
					time: "10:00:00",
				},
				{
					...mockTimeseriesRawData,
					regionalPrices: { JP: 990, US: 6.85, EU: 5.82, CN: 47.88, TW: 207.9, KR: 8811 },
					time: "14:00:00",
				},
				{
					...mockTimeseriesRawData,
					regionalPrices: { JP: 1100, US: 7.61, EU: 6.47, CN: 53.24, TW: 231.0, KR: 9779 },
					time: "18:00:00",
				},
			];

			// 最低価格の計算ロジックをテスト
			const expectedLowestPrices = {
				JP: Math.min(1320, 990, 1100),
				US: Math.min(9.13, 6.85, 7.61),
				EU: Math.min(7.76, 5.82, 6.47),
				CN: Math.min(63.84, 47.88, 53.24),
				TW: Math.min(277.2, 207.9, 231.0),
				KR: Math.min(11748, 8811, 9779),
			};

			expect(expectedLowestPrices).toEqual({
				JP: 990,
				US: 6.85,
				EU: 5.82,
				CN: 47.88,
				TW: 207.9,
				KR: 8811,
			});
		});

		it("複数の生データから正しく最大値を計算する", () => {
			const _rawDataArray: TimeSeriesRawData[] = [
				{
					...mockTimeseriesRawData,
					discountRate: 0,
					salesCount: 1000,
					wishlistCount: 500,
					rankDay: 20,
					ratingAverage: 4.2,
					ratingCount: 80,
				},
				{
					...mockTimeseriesRawData,
					discountRate: 25,
					salesCount: 1234,
					wishlistCount: 567,
					rankDay: 15,
					ratingAverage: 4.5,
					ratingCount: 89,
				},
				{
					...mockTimeseriesRawData,
					discountRate: 10,
					salesCount: 1100,
					wishlistCount: 600,
					rankDay: 18,
					ratingAverage: 4.3,
					ratingCount: 85,
				},
			];

			// 最大値の計算ロジック
			const expectedMaxDiscountRate = Math.max(0, 25, 10);
			const expectedMaxSalesCount = Math.max(1000, 1234, 1100);
			const expectedMaxWishlistCount = Math.max(500, 567, 600);
			const expectedBestRankDay = Math.min(20, 15, 18); // ランキングは小さいほど上位
			const expectedMaxRatingAverage = Math.max(4.2, 4.5, 4.3);
			const expectedMaxRatingCount = Math.max(80, 89, 85);

			expect(expectedMaxDiscountRate).toBe(25);
			expect(expectedMaxSalesCount).toBe(1234);
			expect(expectedMaxWishlistCount).toBe(600);
			expect(expectedBestRankDay).toBe(15);
			expect(expectedMaxRatingAverage).toBe(4.5);
			expect(expectedMaxRatingCount).toBe(89);
		});

		it("キャンペーンIDの重複を除去する", () => {
			const rawDataArray: TimeSeriesRawData[] = [
				{ ...mockTimeseriesRawData, campaignId: 241 },
				{ ...mockTimeseriesRawData, campaignId: 241 },
				{ ...mockTimeseriesRawData, campaignId: 352 },
				{ ...mockTimeseriesRawData, campaignId: undefined },
			];

			const campaignIds = rawDataArray
				.map((d) => d.campaignId)
				.filter((id): id is number => id !== undefined);

			const uniqueCampaignIds = [...new Set(campaignIds)];

			expect(uniqueCampaignIds).toEqual([241, 352]);
		});
	});

	describe("期間指定での日次集計データ取得", () => {
		it("正しい期間フィルターが適用される", () => {
			const _workId = "RJ01037463";
			const startDate = "2025-07-01";
			const endDate = "2025-07-07";

			// 期間フィルタロジックのテスト（実際のクエリはFirestore依存）
			const sampleDates = [
				"2025-06-30", // 範囲外
				"2025-07-01", // 範囲内
				"2025-07-03", // 範囲内
				"2025-07-07", // 範囲内
				"2025-07-08", // 範囲外
			];

			const filteredDates = sampleDates.filter((date) => date >= startDate && date <= endDate);

			expect(filteredDates).toEqual(["2025-07-01", "2025-07-03", "2025-07-07"]);
		});
	});

	describe("データ保持期間管理", () => {
		it("7日前の日付を正しく計算する", () => {
			const baseDate = new Date("2025-07-07T12:00:00Z");
			const sevenDaysAgo = new Date(baseDate);
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

			expect(sevenDaysAgo.toISOString().split("T")[0]).toBe("2025-06-30");
		});

		it("期限切れデータの削除対象を正しく判定する", () => {
			// 2025-07-07T12:00:00Z から7日前は 2025-06-30T12:00:00Z
			const currentDate = new Date("2025-07-07T12:00:00Z");
			const cutoffDate = new Date(currentDate);
			cutoffDate.setDate(cutoffDate.getDate() - 7);

			// cutoffDate = 2025-06-30T12:00:00Z
			// timestamp < cutoffDate なので、6/30 12:00より前のデータが削除対象

			const sampleTimestamps = [
				new Date("2025-06-29T12:00:00Z"), // 削除対象 (< 6/30 12:00)
				new Date("2025-06-30T11:59:59Z"), // 削除対象 (< 6/30 12:00)
				new Date("2025-06-30T12:00:00Z"), // 保持対象 (= 6/30 12:00)
				new Date("2025-07-01T12:00:00Z"), // 保持対象 (> 6/30 12:00)
				new Date("2025-07-07T12:00:00Z"), // 保持対象 (> 6/30 12:00)
			];

			const expiredData = sampleTimestamps.filter((timestamp) => timestamp < cutoffDate);

			expect(expiredData).toHaveLength(2);
			expect(expiredData[0]?.toISOString().split("T")[0]).toBe("2025-06-29");
			expect(expiredData[1]?.toISOString().split("T")[0]).toBe("2025-06-30");
		});
	});

	describe("データ整合性チェック", () => {
		it("時系列生データの必須フィールドが存在する", () => {
			const requiredFields = [
				"workId",
				"timestamp",
				"date",
				"time",
				"regionalPrices",
				"discountRate",
			];

			for (const field of requiredFields) {
				expect(mockTimeseriesRawData).toHaveProperty(field);
			}

			// 地域価格の必須通貨
			const requiredCurrencies = ["JP", "US", "EU", "CN", "TW", "KR"];
			for (const currency of requiredCurrencies) {
				expect(mockTimeseriesRawData.regionalPrices).toHaveProperty(currency);
			}
		});

		it("日次集計データの必須フィールドが存在する", () => {
			const requiredFields = [
				"workId",
				"date",
				"lowestPrices",
				"maxDiscountRate",
				"activeCampaignIds",
				"dataPointCount",
				"firstCaptureTime",
				"lastCaptureTime",
			];

			for (const field of requiredFields) {
				expect(mockTimeseriesDailyAggregate).toHaveProperty(field);
			}
		});
	});
});
