/**
 * Individual Info API マッピング機能のテストスイート
 */

import type { TimeSeriesRawData } from "@suzumina.click/shared-types/work";
import { describe, expect, it } from "vitest";
import {
	debugExtractPriceFields,
	detectPriceChanges,
	type IndividualInfoAPIResponse,
	mapIndividualInfoToTimeSeriesData,
	mapMultipleIndividualInfoToTimeSeries,
	validateTimeSeriesData,
} from "./individual-info-mapper";

// テスト用のモックIndividual Info APIレスポンス
const mockApiResponse: IndividualInfoAPIResponse = {
	workno: "RJ01037463",
	product_id: "RJ01037463",
	work_name: "宮村さんはいつも眠たげ",
	maker_name: "チームランドセル",
	price: 1320,
	price_without_tax: 1200,
	official_price: 1320,
	official_price_without_tax: 1200,
	price_en: 9.13,
	price_eur: 7.76,
	discount_rate: 0,
	is_discount_work: false,
	dl_count: 1234,
	rate_average_star: 4.5,
	rate_count: 89,
	rank_day: 15,
	rank_week: 45,
	rank_month: 120,
	sales_count: 1234,
	wishlist_count: 567,
	regist_date: "2023-05-06 16:00:00",
	update_date: "2023-05-25 19:20:48",
	on_sale: 1,
};

const mockApiResponseWithDiscount: IndividualInfoAPIResponse = {
	...mockApiResponse,
	workno: "RJ01415251",
	price: 990,
	official_price: 1320,
	discount_rate: 25,
	is_discount_work: true,
	campaign_id: 241,
};

const mockApiResponseWithMultiCurrency: IndividualInfoAPIResponse = {
	...mockApiResponse,
	workno: "RJ01020479",
	currency_price: {
		JPY: 1320,
		USD: 9.13,
		EUR: 7.76,
		CNY: 63.84,
		TWD: 277.2,
		KRW: 11748,
	},
	locale_price: [
		{ currency: "JPY", price: 1320, priceString: "1,320円" },
		{ currency: "USD", price: 9.13, priceString: "$9.13" },
		{ currency: "EUR", price: 7.76, priceString: "€7.76" },
	],
};

describe("Individual Info API マッピング", () => {
	describe("mapIndividualInfoToTimeSeriesData", () => {
		it("基本的なAPIレスポンスから時系列データを生成できる", () => {
			const timestamp = new Date("2025-07-07T12:00:00Z");
			const result = mapIndividualInfoToTimeSeriesData(mockApiResponse, timestamp);

			expect(result.workId).toBe("RJ01037463");
			expect(result.timestamp).toBe("2025-07-07T12:00:00.000Z");
			expect(result.date).toBe("2025-07-07");
			expect(result.time).toBe("12:00:00");

			// 価格情報の確認
			expect(result.regionalPrices.JP).toBe(1320);
			expect(result.regionalPrices.US).toBe(9.13);
			expect(result.regionalPrices.EU).toBe(7.76);
			expect(result.discountRate).toBe(0);
			expect(result.campaignId).toBeUndefined();

			// 販売・評価情報の確認
			expect(result.salesCount).toBe(1234);
			expect(result.wishlistCount).toBe(567);
			expect(result.rankDay).toBe(15);
			expect(result.rankWeek).toBe(45);
			expect(result.rankMonth).toBe(120);
			expect(result.ratingAverage).toBe(4.5);
			expect(result.ratingCount).toBe(89);
		});

		it("割引情報を含むAPIレスポンスを正しく処理できる", () => {
			const result = mapIndividualInfoToTimeSeriesData(mockApiResponseWithDiscount);

			expect(result.workId).toBe("RJ01415251");
			expect(result.regionalPrices.JP).toBe(990);
			expect(result.discountRate).toBe(25);
			expect(result.campaignId).toBe(241);
		});

		it("多通貨価格情報を正しく抽出できる", () => {
			const result = mapIndividualInfoToTimeSeriesData(mockApiResponseWithMultiCurrency);

			expect(result.regionalPrices.JP).toBe(1320);
			expect(result.regionalPrices.US).toBe(9.13);
			expect(result.regionalPrices.EU).toBe(7.76);
			expect(result.regionalPrices.CN).toBe(63.84);
			expect(result.regionalPrices.TW).toBe(277.2);
			expect(result.regionalPrices.KR).toBe(11748);
		});

		it("不正な割引率を正規化する", () => {
			const invalidDiscountResponse = {
				...mockApiResponse,
				discount_rate: -10, // 不正な値
			};

			const result = mapIndividualInfoToTimeSeriesData(invalidDiscountResponse);
			expect(result.discountRate).toBe(0); // 0に正規化

			const highDiscountResponse = {
				...mockApiResponse,
				discount_rate: 150, // 100を超える値
			};

			const result2 = mapIndividualInfoToTimeSeriesData(highDiscountResponse);
			expect(result2.discountRate).toBe(100); // 100に正規化
		});

		it("不正な評価値を除外する", () => {
			const invalidRatingResponse = {
				...mockApiResponse,
				rate_average_star: 6.0, // 5.0を超える値
			};

			const result = mapIndividualInfoToTimeSeriesData(invalidRatingResponse);
			expect(result.ratingAverage).toBeUndefined(); // 除外される

			const negativeRatingResponse = {
				...mockApiResponse,
				rate_average_star: -1.0, // 負の値
			};

			const result2 = mapIndividualInfoToTimeSeriesData(negativeRatingResponse);
			expect(result2.ratingAverage).toBeUndefined(); // 除外される
		});
	});

	describe("mapMultipleIndividualInfoToTimeSeries", () => {
		it("複数のAPIレスポンスから時系列データの配列を生成できる", () => {
			const apiResponses = [
				mockApiResponse,
				mockApiResponseWithDiscount,
				mockApiResponseWithMultiCurrency,
			];

			const baseTimestamp = new Date("2025-07-07T12:00:00Z");
			const results = mapMultipleIndividualInfoToTimeSeries(apiResponses, baseTimestamp);

			expect(results).toHaveLength(3);
			expect(results[0]?.workId).toBe("RJ01037463");
			expect(results[1]?.workId).toBe("RJ01415251");
			expect(results[2]?.workId).toBe("RJ01020479");

			// タイムスタンプが1秒ずつずれているか確認
			expect(results[0]?.timestamp).toBe("2025-07-07T12:00:00.000Z");
			expect(results[1]?.timestamp).toBe("2025-07-07T12:00:01.000Z");
			expect(results[2]?.timestamp).toBe("2025-07-07T12:00:02.000Z");
		});

		it("無効なデータをフィルタリングする", () => {
			const invalidApiResponse = {
				// worknoとproduct_idが両方ない不正なレスポンス
				work_name: "無効な作品",
				maker_name: "テストメーカー",
				price: 1000,
			} as any;

			const apiResponses = [mockApiResponse, invalidApiResponse, mockApiResponseWithDiscount];

			const results = mapMultipleIndividualInfoToTimeSeries(apiResponses);

			// 有効なデータのみが返される（2件）
			expect(results).toHaveLength(2);
			expect(results[0]?.workId).toBe("RJ01037463");
			expect(results[1]?.workId).toBe("RJ01415251");
		});
	});

	describe("validateTimeSeriesData", () => {
		const validTimeseriesData: TimeSeriesRawData = {
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
			ratingAverage: 4.5,
			ratingCount: 89,
		};

		it("有効な時系列データを検証できる", () => {
			const result = validateTimeSeriesData(validTimeseriesData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("必須フィールドの不足を検出する", () => {
			const invalidData = {
				...validTimeseriesData,
				workId: "",
			};

			const result = validateTimeSeriesData(invalidData);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("作品IDが設定されていません");
		});

		it("無効な価格情報を検出する", () => {
			const invalidData = {
				...validTimeseriesData,
				regionalPrices: {
					JP: 0,
					US: 0,
					EU: 0,
					CN: 0,
					TW: 0,
					KR: 0,
				},
			};

			const result = validateTimeSeriesData(invalidData);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("有効な価格情報が設定されていません");
		});

		it("無効な割引率を検出する", () => {
			const invalidData = {
				...validTimeseriesData,
				discountRate: -10,
			};

			const result = validateTimeSeriesData(invalidData);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("割引率が無効な範囲です（0-100%）");
		});

		it("無効な評価値を検出する", () => {
			const invalidData = {
				...validTimeseriesData,
				ratingAverage: 6.0,
			};

			const result = validateTimeSeriesData(invalidData);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("評価が無効な範囲です（0-5）");
		});
	});

	describe("detectPriceChanges", () => {
		const baseData: TimeSeriesRawData = {
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
			discountRate: 0,
		};

		it("価格変更を正しく検出する", () => {
			const updatedData = {
				...baseData,
				timestamp: "2025-07-07T13:00:00.000Z",
				time: "13:00:00",
				regionalPrices: {
					...baseData.regionalPrices,
					JP: 990, // 25%の値下げ
					US: 6.85, // 約25%の値下げ
				},
			};

			const result = detectPriceChanges(baseData, updatedData);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(2);

			const jpChange = result.changes.find((c) => c.currency === "JP");
			expect(jpChange?.previousPrice).toBe(1320);
			expect(jpChange?.currentPrice).toBe(990);
			expect(jpChange?.changePercentage).toBe(-25);

			const usChange = result.changes.find((c) => c.currency === "US");
			expect(usChange?.previousPrice).toBe(9.13);
			expect(usChange?.currentPrice).toBe(6.85);
		});

		it("価格変更がない場合を正しく処理する", () => {
			const sameData = {
				...baseData,
				timestamp: "2025-07-07T13:00:00.000Z",
				time: "13:00:00",
			};

			const result = detectPriceChanges(baseData, sameData);
			expect(result.hasChanges).toBe(false);
			expect(result.changes).toHaveLength(0);
		});
	});

	describe("debugExtractPriceFields", () => {
		it("価格関連フィールドのみを抽出する", () => {
			const response = {
				...mockApiResponseWithMultiCurrency,
				work_name: "作品名",
				irrelevant_field: "関係ないデータ",
			};

			const result = debugExtractPriceFields(response);

			expect(result).toHaveProperty("price");
			expect(result).toHaveProperty("discount_rate");
			expect(result).toHaveProperty("currency_price");
			expect(result).toHaveProperty("locale_price");
			expect(result).not.toHaveProperty("work_name");
			expect(result).not.toHaveProperty("irrelevant_field");
		});

		it("存在しない価格フィールドは抽出されない", () => {
			const response = {
				workno: "RJ01037463",
				price: 1320,
				// price_en は存在しない
			};

			const result = debugExtractPriceFields(response);

			expect(result).toEqual({
				price: 1320,
			});
			expect(result).not.toHaveProperty("price_en");
		});

		it("空のオブジェクトの場合、空のオブジェクトが返される", () => {
			const result = debugExtractPriceFields({});

			expect(result).toEqual({});
		});
	});

	describe("為替レート推定機能", () => {
		it("JPY基準で他通貨価格を推定する", () => {
			const responseWithJPYOnly: IndividualInfoAPIResponse = {
				...mockApiResponse,
				price: 1000,
				price_en: 0,
				price_eur: 0,
				currency_price: undefined,
				locale_price: undefined,
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithJPYOnly);

			// JPY基準での為替レート推定
			expect(result.regionalPrices.JP).toBe(1000);
			expect(result.regionalPrices.US).toBeCloseTo(6.7, 1); // 1000 * 0.0067
			expect(result.regionalPrices.EU).toBeCloseTo(6.1, 1); // 1000 * 0.0061
			expect(result.regionalPrices.CN).toBeCloseTo(48, 0); // 1000 * 0.048
			expect(result.regionalPrices.TW).toBe(210); // 1000 * 0.21
			expect(result.regionalPrices.KR).toBe(8900); // 1000 * 8.9
		});

		it("価格がない場合、0価格が設定される", () => {
			const responseWithNoPrices: IndividualInfoAPIResponse = {
				...mockApiResponse,
				price: 0,
				price_en: 0,
				price_eur: 0,
				official_price: 0,
				currency_price: undefined,
				locale_price: undefined,
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithNoPrices);

			// すべての通貨で0価格
			expect(result.regionalPrices.JP).toBe(0);
			expect(result.regionalPrices.US).toBe(0);
			expect(result.regionalPrices.EU).toBe(0);
			expect(result.regionalPrices.CN).toBe(0);
			expect(result.regionalPrices.TW).toBe(0);
			expect(result.regionalPrices.KR).toBe(0);
		});
	});

	describe("文字列数値変換機能", () => {
		it("カンマ区切りの文字列数値を正しく変換する", () => {
			const responseWithStringNumbers: IndividualInfoAPIResponse = {
				...mockApiResponse,
				dl_count: "12,345", // カンマ区切り文字列
				rate_count: "1,000", // カンマ区切り文字列
				sales_count: undefined, // 未定義
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithStringNumbers);

			expect(result.salesCount).toBe(12345); // dl_countで代替
			expect(result.ratingCount).toBe(1000);
		});

		it("無効な文字列はundefinedになる", () => {
			const responseWithInvalidNumbers: IndividualInfoAPIResponse = {
				...mockApiResponse,
				dl_count: "invalid_number",
				rate_count: "abc123",
				sales_count: undefined, // explicitly set to undefined to test the fallback
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithInvalidNumbers);

			expect(result.salesCount).toBeUndefined();
			expect(result.ratingCount).toBeUndefined();
		});

		it("NaN値はundefinedになる", () => {
			const responseWithNaN: IndividualInfoAPIResponse = {
				...mockApiResponse,
				rate_average_star: Number.NaN,
				sales_count: Number.NaN,
				dl_count: undefined, // make sure dl_count fallback is also undefined
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithNaN);

			expect(result.ratingAverage).toBeUndefined();
			expect(result.salesCount).toBeUndefined();
		});
	});

	describe("通貨コード正規化", () => {
		it("様々な通貨コード形式を正しく変換する", () => {
			const responseWithVariousCurrencies: IndividualInfoAPIResponse = {
				...mockApiResponse,
				price: 0, // 基本価格を0にして currency_price からのみ取得
				currency_price: {
					jpy: 1320, // 小文字
					USD: 9.13, // 大文字
					eur: 7.76, // 小文字
					CNY: 63.84, // 大文字
					twd: 277.2, // 小文字
					KRW: 11748, // 大文字
				},
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithVariousCurrencies);

			expect(result.regionalPrices).toEqual({
				JP: 1320,
				US: 9.13,
				EU: 7.76,
				CN: 63.84,
				TW: 277.2,
				KR: 11748,
			});
		});

		it("locale_priceフィールドから正しく価格を抽出する", () => {
			const responseWithLocalePrice: IndividualInfoAPIResponse = {
				...mockApiResponse,
				price: 0,
				locale_price: [
					{ currency: "JPY", price: 1320, priceString: "¥1,320" },
					{ currency: "usd", price: 9.13, priceString: "$9.13" }, // 小文字
					{ currency: "INVALID", price: 100, priceString: "100" }, // 無効通貨
				],
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithLocalePrice);

			expect(result.regionalPrices.JP).toBe(1320);
			expect(result.regionalPrices.US).toBe(9.13);
			// 無効通貨は為替レート推定で補完される
			expect(result.regionalPrices.EU).toBeGreaterThan(0);
		});

		it("無効な通貨コードは無視される", () => {
			const responseWithInvalidCurrency: IndividualInfoAPIResponse = {
				...mockApiResponse,
				currency_price: {
					JPY: 1320,
					INVALID_CURRENCY: 999, // 無効な通貨コード
					"": 888, // 空文字通貨コード
				},
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithInvalidCurrency);

			// JPYのみが設定され、他は為替レート推定で補完
			expect(result.regionalPrices.JP).toBe(1320);
			expect(result.regionalPrices.US).toBeGreaterThan(0); // 推定値
		});
	});

	describe("エラーケースと境界値", () => {
		it("product_idがworknoの代替として使用される", () => {
			const responseWithProductId: IndividualInfoAPIResponse = {
				...mockApiResponse,
				workno: "", // 空文字
				product_id: "RJ01234567",
			};

			const result = mapIndividualInfoToTimeSeriesData(responseWithProductId);

			expect(result.workId).toBe("RJ01234567");
		});

		it("境界値の割引率が正しく処理される", () => {
			const responseWithBoundaryDiscount1: IndividualInfoAPIResponse = {
				...mockApiResponse,
				discount_rate: -5, // 負の値
			};
			const responseWithBoundaryDiscount2: IndividualInfoAPIResponse = {
				...mockApiResponse,
				discount_rate: 105, // 100を超える値
			};

			const result1 = mapIndividualInfoToTimeSeriesData(responseWithBoundaryDiscount1);
			const result2 = mapIndividualInfoToTimeSeriesData(responseWithBoundaryDiscount2);

			expect(result1.discountRate).toBe(0); // 0にクランプ
			expect(result2.discountRate).toBe(100); // 100にクランプ
		});

		it("境界値の評価が正しく処理される", () => {
			const responseWithValidRating: IndividualInfoAPIResponse = {
				...mockApiResponse,
				rate_average_star: 5.0, // 境界値（有効）
			};
			const responseWithInvalidRating: IndividualInfoAPIResponse = {
				...mockApiResponse,
				rate_average_star: 5.1, // 境界値を超える（無効）
			};

			const result1 = mapIndividualInfoToTimeSeriesData(responseWithValidRating);
			const result2 = mapIndividualInfoToTimeSeriesData(responseWithInvalidRating);

			expect(result1.ratingAverage).toBe(5.0); // 有効
			expect(result2.ratingAverage).toBeUndefined(); // 無効
		});

		it("未定義のoptionalフィールドが適切に処理される", () => {
			const minimalResponse: IndividualInfoAPIResponse = {
				workno: "RJ01234567",
				product_id: "RJ01234567",
				work_name: "最小限作品",
				maker_name: "最小限メーカー",
				price: 1000,
				price_en: 5.0,
				price_eur: 4.0,
				discount_rate: 0,
				is_discount_work: false,
			};

			const result = mapIndividualInfoToTimeSeriesData(minimalResponse);

			expect(result.workId).toBe("RJ01234567");
			expect(result.campaignId).toBeUndefined();
			expect(result.salesCount).toBeUndefined();
			expect(result.wishlistCount).toBeUndefined();
			expect(result.rankDay).toBeUndefined();
			expect(result.rankWeek).toBeUndefined();
			expect(result.rankMonth).toBeUndefined();
			expect(result.ratingAverage).toBeUndefined();
			expect(result.ratingCount).toBeUndefined();
		});
	});
});
