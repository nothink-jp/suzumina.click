/**
 * Work Validation Service テスト
 */

import type { DateRange, Price, Rating } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { WorkValidationService } from "../work-validation-service";

describe("WorkValidationService", () => {
	describe("isValidWorkId", () => {
		it("正しい形式の作品IDを検証できる", () => {
			expect(WorkValidationService.isValidWorkId("RJ12345678")).toBe(true);
			expect(WorkValidationService.isValidWorkId("RJ00000001")).toBe(true);
			expect(WorkValidationService.isValidWorkId("RJ99999999")).toBe(true);
		});

		it("不正な形式の作品IDを拒否できる", () => {
			expect(WorkValidationService.isValidWorkId("RJ1234567")).toBe(false); // 7桁
			expect(WorkValidationService.isValidWorkId("RJ123456789")).toBe(false); // 9桁
			expect(WorkValidationService.isValidWorkId("rj12345678")).toBe(false); // 小文字
			expect(WorkValidationService.isValidWorkId("RG12345678")).toBe(false); // RGプレフィックス
			expect(WorkValidationService.isValidWorkId("12345678")).toBe(false); // プレフィックスなし
		});
	});

	describe("isValidCircleId", () => {
		it("正しい形式のサークルIDを検証できる", () => {
			expect(WorkValidationService.isValidCircleId("RG00001")).toBe(true);
			expect(WorkValidationService.isValidCircleId("RG12345")).toBe(true);
			expect(WorkValidationService.isValidCircleId("RG999999")).toBe(true);
		});

		it("不正な形式のサークルIDを拒否できる", () => {
			expect(WorkValidationService.isValidCircleId("RJ12345")).toBe(false); // RJプレフィックス
			expect(WorkValidationService.isValidCircleId("rg12345")).toBe(false); // 小文字
			expect(WorkValidationService.isValidCircleId("RG")).toBe(false); // 数字なし
			expect(WorkValidationService.isValidCircleId("12345")).toBe(false); // プレフィックスなし
		});
	});

	describe("validatePrice", () => {
		it("正常な価格を検証できる", () => {
			const price: Price = {
				amount: 1100,
				currency: "JPY",
				isFree: () => false,
				isDiscounted: () => false,
				discountAmount: () => 0,
				effectiveDiscountRate: () => 0,
				equals: () => false,
				format: () => "¥1,100",
			} as Price;

			const result = WorkValidationService.validatePrice(price);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("無料作品の価格を検証できる", () => {
			const freePrice: Price = {
				amount: 0,
				currency: "JPY",
				isFree: () => true,
				isDiscounted: () => false,
				discountAmount: () => 0,
				effectiveDiscountRate: () => 0,
				equals: () => false,
				format: () => "¥0",
			} as Price;

			const result = WorkValidationService.validatePrice(freePrice);
			expect(result.isValid).toBe(true);
		});

		it("無効な割引率を検出できる", () => {
			const invalidDiscountPrice: Price = {
				amount: 770,
				currency: "JPY",
				original: 1100,
				discount: 150, // 150%は無効
				isFree: () => false,
				isDiscounted: () => true,
				discountAmount: () => 330,
				effectiveDiscountRate: () => 30,
				equals: () => false,
				format: () => "¥770",
			} as Price;

			const result = WorkValidationService.validatePrice(invalidDiscountPrice);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("割引率は0〜100%の範囲で設定する必要があります");
		});

		it("サポートされていない通貨を検出できる", () => {
			const invalidCurrencyPrice: Price = {
				amount: 1000,
				currency: "GBP", // サポート外
				isFree: () => false,
				isDiscounted: () => false,
				discountAmount: () => 0,
				effectiveDiscountRate: () => 0,
				equals: () => false,
				format: () => "£1,000",
			} as Price;

			const result = WorkValidationService.validatePrice(invalidCurrencyPrice);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("サポートされていない通貨: GBP");
		});
	});

	describe("validateRating", () => {
		it("正常な評価を検証できる", () => {
			const rating: Rating = {
				stars: 4.5,
				count: 100,
				average: 4.5,
				hasRatings: () => true,
				isHighlyRated: () => true,
				reliability: () => "high",
				displayStars: () => 5,
				percentage: () => 90,
				equals: () => false,
				format: () => "★4.5 (100件)",
			} as Rating;

			const result = WorkValidationService.validateRating(rating);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("評価数0で平均評価がある場合を検出できる", () => {
			const invalidRating: Rating = {
				stars: 4.0,
				count: 0,
				average: 4.0,
				hasRatings: () => false,
				isHighlyRated: () => true,
				reliability: () => "insufficient",
				displayStars: () => 4,
				percentage: () => 80,
				equals: () => false,
				format: () => "★4.0 (0件)",
			} as Rating;

			const result = WorkValidationService.validateRating(invalidRating);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("評価数が0の場合、平均評価は0である必要があります");
		});

		it("評価分布の整合性を検証できる", () => {
			const ratingWithDistribution: Rating = {
				stars: 4.0,
				count: 100,
				average: 4.0,
				distribution: {
					1: 5,
					2: 10,
					3: 15,
					4: 30,
					5: 35, // 合計95で不整合
				},
				hasRatings: () => true,
				isHighlyRated: () => true,
				reliability: () => "high",
				displayStars: () => 4,
				percentage: () => 80,
				equals: () => false,
				format: () => "★4.0 (100件)",
			} as Rating;

			const result = WorkValidationService.validateRating(ratingWithDistribution);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("評価分布の合計と評価数が一致しません");
		});
	});

	describe("validatePriceHistory", () => {
		it("正常な価格履歴を検証できる", () => {
			const priceHistory: Price[] = [
				{
					amount: 1100,
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "¥1,100",
				} as Price,
				{
					amount: 990,
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => true,
					discountAmount: () => 110,
					effectiveDiscountRate: () => 10,
					equals: () => false,
					format: () => "¥990",
				} as Price,
			];

			const result = WorkValidationService.validatePriceHistory(priceHistory);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("異常な価格変動を検出できる", () => {
			const priceHistory: Price[] = [
				{
					amount: 1000,
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "¥1,000",
				} as Price,
				{
					amount: 100, // 90%の値下げは異常
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => true,
					discountAmount: () => 900,
					effectiveDiscountRate: () => 90,
					equals: () => false,
					format: () => "¥100",
				} as Price,
			];

			const result = WorkValidationService.validatePriceHistory(priceHistory);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toMatch(/異常な価格変動を検出/);
		});

		it("複数通貨の混在を検出できる", () => {
			const priceHistory: Price[] = [
				{
					amount: 1000,
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "¥1,000",
				} as Price,
				{
					amount: 10,
					currency: "USD", // 通貨が異なる
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "$10",
				} as Price,
			];

			const result = WorkValidationService.validatePriceHistory(priceHistory);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("価格履歴内で複数の通貨が混在しています");
		});
	});

	describe("validateReleaseDate", () => {
		it("正常なリリース日を検証できる", () => {
			const dateRange: DateRange = {
				original: "2024-01-15",
				iso: "2024-01-15T00:00:00.000Z",
				display: "2024年1月15日",
				toDate: () => new Date("2024-01-15"),
				daysFromNow: () => 10,
				relative: () => "10日前",
				equals: () => false,
				format: () => "2024-01-15",
			} as DateRange;

			const result = WorkValidationService.validateReleaseDate(dateRange);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("未来の日付を検出できる", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 30);

			const futureDateRange: DateRange = {
				original: futureDate.toISOString().split("T")[0],
				iso: futureDate.toISOString(),
				display: `${futureDate.getFullYear()}年${futureDate.getMonth() + 1}月${futureDate.getDate()}日`,
				toDate: () => futureDate,
				daysFromNow: () => -30,
				relative: () => "30日後",
				equals: () => false,
				format: () => futureDate.toISOString().split("T")[0],
			} as DateRange;

			const result = WorkValidationService.validateReleaseDate(futureDateRange);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("リリース日が未来の日付になっています");
		});

		it("DLsite開設前の日付を検出できる", () => {
			const oldDateRange: DateRange = {
				original: "1990-01-01",
				iso: "1990-01-01T00:00:00.000Z",
				display: "1990年1月1日",
				toDate: () => new Date("1990-01-01"),
				daysFromNow: () => 12000,
				relative: () => "30年以上前",
				equals: () => false,
				format: () => "1990-01-01",
			} as DateRange;

			const result = WorkValidationService.validateReleaseDate(oldDateRange);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("リリース日がDLsite開設前の日付になっています");
		});
	});

	describe("validateWorkData", () => {
		it("完全な作品データを検証できる", () => {
			const workData = {
				id: "RJ12345678",
				price: {
					amount: 1100,
					currency: "JPY",
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "¥1,100",
				} as Price,
				rating: {
					stars: 4.5,
					count: 100,
					average: 4.5,
					hasRatings: () => true,
					isHighlyRated: () => true,
					reliability: () => "high" as const,
					displayStars: () => 5,
					percentage: () => 90,
					equals: () => false,
					format: () => "★4.5 (100件)",
				} as Rating,
				releaseDate: {
					original: "2024-01-15",
					iso: "2024-01-15T00:00:00.000Z",
					display: "2024年1月15日",
					toDate: () => new Date("2024-01-15"),
					daysFromNow: () => 10,
					relative: () => "10日前",
					equals: () => false,
					format: () => "2024-01-15",
				} as DateRange,
			};

			const result = WorkValidationService.validateWorkData(workData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("複数のエラーを集約できる", () => {
			const invalidWorkData = {
				id: "INVALID123", // 無効なID
				price: {
					amount: 1000,
					currency: "XXX", // 無効な通貨
					isFree: () => false,
					isDiscounted: () => false,
					discountAmount: () => 0,
					effectiveDiscountRate: () => 0,
					equals: () => false,
					format: () => "XXX1,000",
				} as Price,
				rating: {
					stars: 6.0, // 範囲外
					count: 100,
					average: 6.0,
					hasRatings: () => true,
					isHighlyRated: () => true,
					reliability: () => "high" as const,
					displayStars: () => 6,
					percentage: () => 120,
					equals: () => false,
					format: () => "★6.0 (100件)",
				} as Rating,
			};

			const result = WorkValidationService.validateWorkData(invalidWorkData);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(2);
			expect(result.errors.some((e) => e.includes("無効な作品ID形式"))).toBe(true);
			expect(result.errors.some((e) => e.includes("サポートされていない通貨"))).toBe(true);
			expect(result.errors.some((e) => e.includes("評価は0〜5の範囲"))).toBe(true);
		});
	});
});
