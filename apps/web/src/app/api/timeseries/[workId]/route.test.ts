/**
 * 時系列データAPI Routeのテストスイート
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// モックの設定
const mockFirestore = {
	collection: vi.fn(),
};

const mockCollection = {
	where: vi.fn(),
	orderBy: vi.fn(),
	get: vi.fn(),
};

const mockQuery = {
	where: vi.fn(),
	orderBy: vi.fn(),
	get: vi.fn(),
};

const mockSnapshot = {
	empty: false,
	size: 3,
	docs: [
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-05",
				lowestPrices: {
					JP: 990,
					US: 6.85,
					EU: 5.82,
					CN: 47.88,
					TW: 207.9,
					KR: 8811,
				},
				maxDiscountRate: 25,
				bestRankDay: 15,
				bestRankWeek: 45,
				bestRankMonth: 120,
				createdAt: { toDate: () => new Date("2025-07-05T12:00:00Z") },
			})),
		},
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-06",
				lowestPrices: {
					JP: 1100,
					US: 7.61,
					EU: 6.47,
					CN: 53.24,
					TW: 231.0,
					KR: 9779,
				},
				maxDiscountRate: 10,
				bestRankDay: 12,
				bestRankWeek: 40,
				bestRankMonth: 115,
				createdAt: { toDate: () => new Date("2025-07-06T12:00:00Z") },
			})),
		},
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-07",
				lowestPrices: {
					JP: 1320,
					US: 9.13,
					EU: 7.76,
					CN: 63.84,
					TW: 277.2,
					KR: 11748,
				},
				maxDiscountRate: 0,
				bestRankDay: 10,
				bestRankWeek: 35,
				bestRankMonth: 110,
				createdAt: { toDate: () => new Date("2025-07-07T12:00:00Z") },
			})),
		},
	],
};

// firestoreモック
vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

beforeEach(() => {
	vi.clearAllMocks();

	// Restore mock snapshot to original state
	mockSnapshot.empty = false;
	mockSnapshot.size = 3;
	mockSnapshot.docs = [
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-05",
				lowestPrices: {
					JP: 990,
					US: 6.85,
					EU: 5.82,
					CN: 47.88,
					TW: 207.9,
					KR: 8811,
				},
				maxDiscountRate: 25,
				bestRankDay: 15,
				bestRankWeek: 45,
				bestRankMonth: 120,
				createdAt: { toDate: () => new Date("2025-07-05T12:00:00Z") },
			})),
		},
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-06",
				lowestPrices: {
					JP: 1100,
					US: 7.61,
					EU: 6.47,
					CN: 53.24,
					TW: 231.0,
					KR: 9779,
				},
				maxDiscountRate: 10,
				bestRankDay: 12,
				bestRankWeek: 40,
				bestRankMonth: 115,
				createdAt: { toDate: () => new Date("2025-07-06T12:00:00Z") },
			})),
		},
		{
			data: vi.fn(() => ({
				workId: "RJ01037463",
				date: "2025-07-07",
				lowestPrices: {
					JP: 1320,
					US: 9.13,
					EU: 7.76,
					CN: 63.84,
					TW: 277.2,
					KR: 11748,
				},
				maxDiscountRate: 0,
				bestRankDay: 10,
				bestRankWeek: 35,
				bestRankMonth: 110,
				createdAt: { toDate: () => new Date("2025-07-07T12:00:00Z") },
			})),
		},
	];

	mockFirestore.collection.mockReturnValue(mockCollection);
	mockCollection.where.mockReturnValue(mockQuery);
	mockCollection.orderBy.mockReturnValue(mockQuery);
	mockCollection.get.mockResolvedValue(mockSnapshot);

	mockQuery.where.mockReturnValue(mockQuery);
	mockQuery.orderBy.mockReturnValue(mockQuery);
	mockQuery.get.mockResolvedValue(mockSnapshot);
});

describe("時系列データAPI Route", () => {
	describe("GET /api/timeseries/[workId]", () => {
		it("価格データを正しく取得・変換する", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/timeseries/RJ01037463?type=price&region=JP&period=7d",
			);
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.workId).toBe("RJ01037463");
			expect(data.type).toBe("price");
			expect(data.region).toBe("JP");
			expect(data.period).toBe("7d");
			expect(data.data).toHaveLength(3);

			// 価格データの構造確認
			const firstDataPoint = data.data[0];
			expect(firstDataPoint).toEqual({
				date: "2025-07-05",
				value: 990,
				originalValue: null,
				discount: 25,
				isOnSale: true,
			});
		});

		it("無効なtypeパラメータ（salesは削除済み）でバリデーションエラーが発生する", async () => {
			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463?type=sales");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("無効なパラメータです");
		});

		it("ランキングデータを正しく取得・変換する", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/timeseries/RJ01037463?type=ranking&period=90d",
			);
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.type).toBe("ranking");
			expect(data.data).toHaveLength(3);

			// ランキングデータの構造確認
			const firstDataPoint = data.data[0];
			expect(firstDataPoint).toEqual({
				date: "2025-07-05",
				daily: 15,
				weekly: 45,
				monthly: 120,
			});
		});

		it("各地域の価格データを正しく取得する", async () => {
			const regions = ["JP", "US", "EU", "CN", "TW", "KR"];

			for (const region of regions) {
				const request = new NextRequest(
					`http://localhost:3000/api/timeseries/RJ01037463?type=price&region=${region}`,
				);
				const params = { workId: "RJ01037463" };

				const response = await GET(request, { params });
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.region).toBe(region);
				expect(data.data[0]?.value).toBeGreaterThan(0);
			}
		});

		it("異なる期間パラメータで正しい日付範囲を計算する", async () => {
			const periods = ["7d", "30d", "90d", "1y", "all"];

			for (const period of periods) {
				const request = new NextRequest(
					`http://localhost:3000/api/timeseries/RJ01037463?period=${period}`,
				);
				const params = { workId: "RJ01037463" };

				const response = await GET(request, { params });
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.period).toBe(period);
				expect(data.metadata.startDate).toBeDefined();
				expect(data.metadata.endDate).toBeDefined();
			}
		});

		it("デフォルトパラメータが正しく適用される", async () => {
			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.type).toBe("price"); // デフォルト
			expect(data.region).toBe("JP"); // デフォルト
			expect(data.period).toBe("30d"); // デフォルト
		});

		it("データが見つからない場合、適切なレスポンスを返す", async () => {
			mockSnapshot.empty = true;
			mockSnapshot.docs = [];

			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ99999999");
			const params = { workId: "RJ99999999" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data).toEqual([]);
			expect(data.message).toBe("時系列データが見つかりません");
		});

		it("無効なworkIdでバリデーションエラーが発生する", async () => {
			const request = new NextRequest("http://localhost:3000/api/timeseries/");
			const params = { workId: "" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("無効なパラメータです");
			expect(data.details).toBeDefined();
		});

		it("無効なtypeパラメータでバリデーションエラーが発生する", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/timeseries/RJ01037463?type=invalid",
			);
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("無効なパラメータです");
		});

		it("無効なregionパラメータでバリデーションエラーが発生する", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/timeseries/RJ01037463?region=INVALID",
			);
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("無効なパラメータです");
		});

		it("無効なperiodパラメータでバリデーションエラーが発生する", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/timeseries/RJ01037463?period=invalid",
			);
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("無効なパラメータです");
		});

		it("Firestoreエラーで500エラーが返される", async () => {
			// Mock the query chain to fail
			mockQuery.get.mockRejectedValue(new Error("Firestore connection error"));

			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("時系列データの取得に失敗しました");
		});

		it("メタデータが正しく設定される", async () => {
			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.metadata).toEqual({
				dataPoints: 3,
				startDate: expect.any(String),
				endDate: expect.any(String),
				lastUpdated: "2025-07-07T12:00:00.000Z",
			});
		});

		it("割引なしの価格データでisOnSaleがfalseになる", async () => {
			// 割引率0のデータのみに変更
			mockSnapshot.docs = [
				{
					data: vi.fn(() => ({
						workId: "RJ01037463",
						date: "2025-07-07",
						lowestPrices: { JP: 1320 },
						maxDiscountRate: 0, // 割引なし
					})),
				},
			];

			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463?type=price");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data[0]?.isOnSale).toBe(false);
			expect(data.data[0]?.discount).toBe(0);
		});

		it("価格が0の場合も正しく処理される", async () => {
			mockSnapshot.docs = [
				{
					data: vi.fn(() => ({
						workId: "RJ01037463",
						date: "2025-07-07",
						lowestPrices: { JP: 0 }, // 価格0
						maxDiscountRate: 0,
					})),
				},
			];

			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463?type=price");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data[0]?.value).toBe(0);
		});

		it("createdAtが存在しない場合もエラーにならない", async () => {
			mockSnapshot.docs = [
				{
					data: vi.fn(() => ({
						workId: "RJ01037463",
						date: "2025-07-07",
						lowestPrices: { JP: 1320 },
						maxDiscountRate: 0,
						// createdAt なし
					})),
				},
			];

			const request = new NextRequest("http://localhost:3000/api/timeseries/RJ01037463");
			const params = { workId: "RJ01037463" };

			const response = await GET(request, { params });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.metadata.lastUpdated).toBeNull();
		});
	});

	describe("calculateStartDate helper", () => {
		// calculateStartDate は内部関数のため、実際のAPIレスポンスを通じて間接的にテスト
		it("期間計算が正しく動作することを各期間でテスト", async () => {
			const testCases = [
				{ period: "7d", description: "7日前" },
				{ period: "30d", description: "30日前" },
				{ period: "90d", description: "90日前" },
				{ period: "1y", description: "1年前" },
				{ period: "all", description: "2年前（all期間）" },
			];

			for (const testCase of testCases) {
				const request = new NextRequest(
					`http://localhost:3000/api/timeseries/RJ01037463?period=${testCase.period}`,
				);
				const params = { workId: "RJ01037463" };

				const response = await GET(request, { params });
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.metadata.startDate).toBeDefined();
				expect(data.metadata.endDate).toBeDefined();

				// 開始日が終了日より前であることを確認
				expect(new Date(data.metadata.startDate).getTime()).toBeLessThan(
					new Date(data.metadata.endDate).getTime(),
				);
			}
		});
	});
});
