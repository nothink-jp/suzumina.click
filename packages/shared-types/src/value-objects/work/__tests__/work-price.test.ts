import { describe, expect, it } from "vitest";
import { WorkPrice } from "../work-price";

describe("WorkPrice", () => {
	describe("constructor", () => {
		it("should create a valid work price", () => {
			const price = new WorkPrice(1000, "JPY", 1500, 33, 100);
			expect(price.current).toBe(1000);
			expect(price.currency).toBe("JPY");
			expect(price.original).toBe(1500);
			expect(price.discount).toBe(33);
			expect(price.point).toBe(100);
		});

		it("should use default currency JPY", () => {
			const price = new WorkPrice(1000);
			expect(price.currency).toBe("JPY");
		});

		it("should throw error for negative current price", () => {
			expect(() => new WorkPrice(-100)).toThrow("Price cannot be negative");
		});

		it("should throw error for negative original price", () => {
			expect(() => new WorkPrice(1000, "JPY", -1500)).toThrow("Original price cannot be negative");
		});

		it("should throw error for invalid discount", () => {
			expect(() => new WorkPrice(1000, "JPY", 1500, -10)).toThrow(
				"Discount must be between 0 and 100",
			);
			expect(() => new WorkPrice(1000, "JPY", 1500, 101)).toThrow(
				"Discount must be between 0 and 100",
			);
		});

		it("should throw error for negative points", () => {
			expect(() => new WorkPrice(1000, "JPY", 1500, 30, -100)).toThrow("Points cannot be negative");
		});

		it("should throw error for invalid currency", () => {
			expect(() => new WorkPrice(1000, "INVALID")).toThrow("Invalid currency code: INVALID");
		});

		it("should accept valid currencies", () => {
			const currencies = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"];
			currencies.forEach((currency) => {
				expect(() => new WorkPrice(1000, currency)).not.toThrow();
			});
		});
	});

	describe("isFree", () => {
		it("should return true for zero price", () => {
			expect(new WorkPrice(0).isFree()).toBe(true);
		});

		it("should return false for non-zero price", () => {
			expect(new WorkPrice(100).isFree()).toBe(false);
			expect(new WorkPrice(1000).isFree()).toBe(false);
		});
	});

	describe("isDiscounted", () => {
		it("should return true when original price is higher than current", () => {
			expect(new WorkPrice(700, "JPY", 1000).isDiscounted()).toBe(true);
		});

		it("should return false when no original price", () => {
			expect(new WorkPrice(1000).isDiscounted()).toBe(false);
		});

		it("should return false when original equals current", () => {
			expect(new WorkPrice(1000, "JPY", 1000).isDiscounted()).toBe(false);
		});
	});

	describe("getDiscountAmount", () => {
		it("should calculate discount amount", () => {
			expect(new WorkPrice(700, "JPY", 1000).getDiscountAmount()).toBe(300);
			expect(new WorkPrice(1500, "JPY", 2000).getDiscountAmount()).toBe(500);
		});

		it("should return 0 when no original price", () => {
			expect(new WorkPrice(1000).getDiscountAmount()).toBe(0);
		});
	});

	describe("getEffectiveDiscountRate", () => {
		it("should calculate discount percentage", () => {
			expect(new WorkPrice(700, "JPY", 1000).getEffectiveDiscountRate()).toBe(30);
			expect(new WorkPrice(500, "JPY", 1000).getEffectiveDiscountRate()).toBe(50);
			expect(new WorkPrice(250, "JPY", 1000).getEffectiveDiscountRate()).toBe(75);
		});

		it("should return 0 when no original price", () => {
			expect(new WorkPrice(1000).getEffectiveDiscountRate()).toBe(0);
		});

		it("should return 0 when original price is 0", () => {
			expect(new WorkPrice(0, "JPY", 0).getEffectiveDiscountRate()).toBe(0);
		});

		it("should round to nearest integer", () => {
			expect(new WorkPrice(666, "JPY", 1000).getEffectiveDiscountRate()).toBe(33);
			expect(new WorkPrice(667, "JPY", 1000).getEffectiveDiscountRate()).toBe(33);
		});
	});

	describe("format", () => {
		it("should format price in JPY", () => {
			expect(new WorkPrice(1000, "JPY").format()).toBe("￥1,000");
			expect(new WorkPrice(0, "JPY").format()).toBe("￥0");
			expect(new WorkPrice(1234567, "JPY").format()).toBe("￥1,234,567");
		});

		it("should format price in USD", () => {
			const price = new WorkPrice(99, "USD");
			const formatted = price.format();
			expect(formatted).toContain("$");
			expect(formatted).toContain("99");
		});
	});

	describe("formatWithOriginal", () => {
		it("should include original price when discounted", () => {
			const price = new WorkPrice(700, "JPY", 1000);
			expect(price.formatWithOriginal()).toBe("￥700 (元: ￥1,000)");
		});

		it("should not include original price when not discounted", () => {
			const price = new WorkPrice(1000, "JPY");
			expect(price.formatWithOriginal()).toBe("￥1,000");
		});
	});

	describe("toString", () => {
		it("should use formatWithOriginal", () => {
			const price = new WorkPrice(700, "JPY", 1000);
			expect(price.toString()).toBe(price.formatWithOriginal());
		});
	});

	describe("toJSON", () => {
		it("should include all defined properties", () => {
			const price = new WorkPrice(700, "JPY", 1000, 30, 70);
			expect(price.toJSON()).toEqual({
				current: 700,
				currency: "JPY",
				original: 1000,
				discount: 30,
				point: 70,
			});
		});

		it("should exclude undefined properties", () => {
			const price = new WorkPrice(1000, "JPY");
			expect(price.toJSON()).toEqual({
				current: 1000,
				currency: "JPY",
			});
		});
	});

	describe("toPlainObject", () => {
		it("should include computed properties", () => {
			const price = new WorkPrice(700, "JPY", 1000, 30, 70);
			const plain = price.toPlainObject();

			expect(plain).toMatchObject({
				current: 700,
				original: 1000,
				currency: "JPY",
				discount: 30,
				point: 70,
				isFree: false,
				isDiscounted: true,
				formattedPrice: "￥700 (元: ￥1,000)",
			});
		});

		it("should handle free price", () => {
			const price = new WorkPrice(0);
			const plain = price.toPlainObject();

			expect(plain.isFree).toBe(true);
			expect(plain.isDiscounted).toBe(false);
		});
	});

	describe("equals", () => {
		it("should return true for equal prices", () => {
			const price1 = new WorkPrice(1000, "JPY", 1500, 33, 100);
			const price2 = new WorkPrice(1000, "JPY", 1500, 33, 100);
			expect(price1.equals(price2)).toBe(true);
		});

		it("should return false for different prices", () => {
			const price1 = new WorkPrice(1000, "JPY");
			const price2 = new WorkPrice(2000, "JPY");
			expect(price1.equals(price2)).toBe(false);
		});

		it("should return false for different currencies", () => {
			const price1 = new WorkPrice(1000, "JPY");
			const price2 = new WorkPrice(1000, "USD");
			expect(price1.equals(price2)).toBe(false);
		});

		it("should handle undefined optional properties", () => {
			const price1 = new WorkPrice(1000, "JPY");
			const price2 = new WorkPrice(1000, "JPY", undefined, undefined, undefined);
			expect(price1.equals(price2)).toBe(true);
		});

		it("should return false for non-WorkPrice", () => {
			const price = new WorkPrice(1000);
			expect(price.equals({} as any)).toBe(false);
		});
	});

	describe("withDiscount", () => {
		it("should create new price with discount", () => {
			const original = new WorkPrice(1000);
			const discounted = original.withDiscount(30);

			expect(discounted.current).toBe(700);
			expect(discounted.original).toBe(1000);
			expect(discounted.discount).toBe(30);
		});

		it("should use provided original price", () => {
			const price = new WorkPrice(1000);
			const discounted = price.withDiscount(50, 2000);

			expect(discounted.current).toBe(1000);
			expect(discounted.original).toBe(2000);
		});

		it("should preserve currency and points", () => {
			const original = new WorkPrice(1000, "USD", undefined, undefined, 100);
			const discounted = original.withDiscount(20);

			expect(discounted.currency).toBe("USD");
			expect(discounted.point).toBe(100);
		});

		it("should floor discounted price", () => {
			const original = new WorkPrice(999);
			const discounted = original.withDiscount(33); // 33% off 999 = 669.33

			expect(discounted.current).toBe(669); // Floored
		});
	});

	describe("fromLegacyPriceInfo", () => {
		it("should create from legacy format", () => {
			const price = WorkPrice.fromLegacyPriceInfo({
				current: 1000,
				original: 1500,
				currency: "JPY",
				discount: 33,
				point: 100,
			});

			expect(price.current).toBe(1000);
			expect(price.original).toBe(1500);
			expect(price.currency).toBe("JPY");
			expect(price.discount).toBe(33);
			expect(price.point).toBe(100);
		});

		it("should handle free price flag", () => {
			const price = WorkPrice.fromLegacyPriceInfo({
				current: 1000,
				isFreeOrMissingPrice: true,
			});

			expect(price.current).toBe(0);
			expect(price.isFree()).toBe(true);
		});

		it("should use default currency", () => {
			const price = WorkPrice.fromLegacyPriceInfo({
				current: 1000,
			});

			expect(price.currency).toBe("JPY");
		});

		it("should handle missing optional fields", () => {
			const price = WorkPrice.fromLegacyPriceInfo({
				current: 1000,
			});

			expect(price.original).toBeUndefined();
			expect(price.discount).toBeUndefined();
			expect(price.point).toBeUndefined();
		});
	});
});
