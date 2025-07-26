import { describe, expect, it } from "vitest";
import { Price, PriceComparison } from "../work/price";

describe("Price Value Object", () => {
	describe("Price creation and methods", () => {
		it("無料作品を正しく判定する", () => {
			const freePrice = Price.parse({
				amount: 0,
				currency: "JPY",
			});

			expect(freePrice.isFree()).toBe(true);
			expect(freePrice.isDiscounted()).toBe(false);
		});

		it("割引作品を正しく判定する", () => {
			const discountedPrice = Price.parse({
				amount: 800,
				currency: "JPY",
				original: 1000,
			});

			expect(discountedPrice.isDiscounted()).toBe(true);
			expect(discountedPrice.discountAmount()).toBe(200);
			expect(discountedPrice.effectiveDiscountRate()).toBe(20);
		});

		it("価格を正しくフォーマットする", () => {
			const price = Price.parse({
				amount: 1980,
				currency: "JPY",
			});

			expect(price.format()).toMatch(/¥|￥/);
			expect(price.format()).toContain("1,980");
		});

		it("等価性を正しく判定する", () => {
			const price1 = Price.parse({
				amount: 1000,
				currency: "JPY",
				point: 100,
			});

			const price2 = Price.parse({
				amount: 1000,
				currency: "JPY",
				point: 100,
			});

			const price3 = Price.parse({
				amount: 1000,
				currency: "USD",
				point: 100,
			});

			expect(price1.equals(price2)).toBe(true);
			expect(price1.equals(price3)).toBe(false);
		});
	});

	describe("PriceComparison utilities", () => {
		it("最安値を正しく取得する", () => {
			const prices = [
				Price.parse({ amount: 1000, currency: "JPY" }),
				Price.parse({ amount: 800, currency: "JPY" }),
				Price.parse({ amount: 1200, currency: "JPY" }),
			];

			const lowest = PriceComparison.getLowest(prices);
			expect(lowest?.amount).toBe(800);
		});

		it("最高値を正しく取得する", () => {
			const prices = [
				Price.parse({ amount: 1000, currency: "JPY" }),
				Price.parse({ amount: 800, currency: "JPY" }),
				Price.parse({ amount: 1200, currency: "JPY" }),
			];

			const highest = PriceComparison.getHighest(prices);
			expect(highest?.amount).toBe(1200);
		});

		it("価格変動率を正しく計算する", () => {
			const oldPrice = Price.parse({ amount: 1000, currency: "JPY" });
			const newPrice = Price.parse({ amount: 1200, currency: "JPY" });

			const changeRate = PriceComparison.calculateChangeRate(oldPrice, newPrice);
			expect(changeRate).toBe(20);
		});

		it("異なる通貨での比較はエラーを投げる", () => {
			const jpyPrice = Price.parse({ amount: 1000, currency: "JPY" });
			const usdPrice = Price.parse({ amount: 10, currency: "USD" });

			expect(() => {
				PriceComparison.calculateChangeRate(jpyPrice, usdPrice);
			}).toThrow("Cannot compare prices with different currencies");
		});
	});
});
