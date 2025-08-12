import { describe, expect, it } from "vitest";
import { WorkPrice } from "../work-price";

// Helper function to create WorkPrice instances for testing
function createPrice(
	current: number,
	currency = "JPY",
	original?: number,
	discount?: number,
	point?: number,
): WorkPrice {
	const result = WorkPrice.create(current, currency, original, discount, point);
	if (result.isErr()) {
		throw new Error(`Failed to create WorkPrice: ${result.error.message}`);
	}
	return result._unsafeUnwrap();
}

describe("WorkPrice", () => {
	describe("create", () => {
		it("should create a valid work price", () => {
			const result = WorkPrice.create(1000, "JPY", 1500, 33, 100);
			expect(result.isOk()).toBe(true);
			const price = result._unsafeUnwrap();
			expect(price.current).toBe(1000);
			expect(price.currency).toBe("JPY");
			expect(price.original).toBe(1500);
			expect(price.discount).toBe(33);
			expect(price.point).toBe(100);
		});

		it("should use default currency JPY", () => {
			const result = WorkPrice.create(1000);
			expect(result.isOk()).toBe(true);
			const price = result._unsafeUnwrap();
			expect(price.currency).toBe("JPY");
		});

		it("should return error for negative current price", () => {
			const result = WorkPrice.create(-100);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("Price cannot be negative");
			}
		});

		it("should return error for negative original price", () => {
			const result = WorkPrice.create(1000, "JPY", -1500);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("Original price cannot be negative");
			}
		});

		it("should return error for invalid discount", () => {
			const result1 = WorkPrice.create(1000, "JPY", 1500, -10);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toContain("Discount must be between 0 and 100");
			}

			const result2 = WorkPrice.create(1000, "JPY", 1500, 101);
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toContain("Discount must be between 0 and 100");
			}
		});

		it("should return error for negative points", () => {
			const result = WorkPrice.create(1000, "JPY", 1500, 30, -100);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("Points cannot be negative");
			}
		});

		it("should return error for invalid currency", () => {
			const result = WorkPrice.create(1000, "INVALID");
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("Invalid currency code: INVALID");
			}
		});

		it("should accept valid currencies", () => {
			const currencies = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"];
			currencies.forEach((currency) => {
				const result = WorkPrice.create(1000, currency);
				expect(result.isOk()).toBe(true);
			});
		});
	});

	describe("isFree", () => {
		it("should return true for zero price", () => {
			expect(createPrice(0).isFree()).toBe(true);
		});

		it("should return false for non-zero price", () => {
			expect(createPrice(100).isFree()).toBe(false);
			expect(createPrice(1000).isFree()).toBe(false);
		});
	});

	describe("isDiscounted", () => {
		it("should return true when original price is higher than current", () => {
			expect(createPrice(700, "JPY", 1000).isDiscounted()).toBe(true);
		});

		it("should return false when no original price", () => {
			expect(createPrice(1000).isDiscounted()).toBe(false);
		});

		it("should return false when original equals current", () => {
			expect(createPrice(1000, "JPY", 1000).isDiscounted()).toBe(false);
		});
	});

	describe("getDiscountAmount", () => {
		it("should calculate discount amount", () => {
			expect(createPrice(700, "JPY", 1000).getDiscountAmount()).toBe(300);
			expect(createPrice(1500, "JPY", 2000).getDiscountAmount()).toBe(500);
		});

		it("should return 0 when no original price", () => {
			expect(createPrice(1000).getDiscountAmount()).toBe(0);
		});
	});

	describe("getEffectiveDiscountRate", () => {
		it("should calculate discount percentage", () => {
			expect(createPrice(700, "JPY", 1000).getEffectiveDiscountRate()).toBe(30);
			expect(createPrice(500, "JPY", 1000).getEffectiveDiscountRate()).toBe(50);
			expect(createPrice(250, "JPY", 1000).getEffectiveDiscountRate()).toBe(75);
		});

		it("should return 0 when no original price", () => {
			expect(createPrice(1000).getEffectiveDiscountRate()).toBe(0);
		});

		it("should return 0 when original price is 0", () => {
			expect(createPrice(0, "JPY", 0).getEffectiveDiscountRate()).toBe(0);
		});

		it("should round to nearest integer", () => {
			expect(createPrice(666, "JPY", 1000).getEffectiveDiscountRate()).toBe(33);
			expect(createPrice(667, "JPY", 1000).getEffectiveDiscountRate()).toBe(33);
		});
	});

	describe("format", () => {
		it("should format price in JPY", () => {
			expect(createPrice(1000, "JPY").format()).toBe("￥1,000");
			expect(createPrice(0, "JPY").format()).toBe("￥0");
			expect(createPrice(1234567, "JPY").format()).toBe("￥1,234,567");
		});

		it("should format price in USD", () => {
			const price = createPrice(99, "USD");
			const formatted = price.format();
			expect(formatted).toContain("$");
			expect(formatted).toContain("99");
		});
	});

	describe("formatWithOriginal", () => {
		it("should include original price when discounted", () => {
			const price = createPrice(700, "JPY", 1000);
			expect(price.formatWithOriginal()).toBe("￥700 (元: ￥1,000)");
		});

		it("should not include original price when not discounted", () => {
			const price = createPrice(1000, "JPY");
			expect(price.formatWithOriginal()).toBe("￥1,000");
		});
	});

	describe("toString", () => {
		it("should use formatWithOriginal", () => {
			const price = createPrice(700, "JPY", 1000);
			expect(price.toString()).toBe(price.formatWithOriginal());
		});
	});

	describe("toJSON", () => {
		it("should include all defined properties", () => {
			const price = createPrice(700, "JPY", 1000, 30, 70);
			expect(price.toJSON()).toEqual({
				current: 700,
				currency: "JPY",
				original: 1000,
				discount: 30,
				point: 70,
			});
		});

		it("should exclude undefined properties", () => {
			const price = createPrice(1000, "JPY");
			expect(price.toJSON()).toEqual({
				current: 1000,
				currency: "JPY",
			});
		});
	});

	describe("toPlainObject", () => {
		it("should include basic properties", () => {
			const price = createPrice(700, "JPY", 1000, 30, 70);
			const plain = price.toPlainObject();

			expect(plain).toEqual({
				current: 700,
				original: 1000,
				currency: "JPY",
				discount: 30,
				point: 70,
				isFree: false,
				isDiscounted: true,
				formattedPrice: "￥700",
			});
		});

		it("should handle free price", () => {
			const price = createPrice(0);
			const plain = price.toPlainObject();

			expect(plain.current).toBe(0);
			expect(plain.currency).toBe("JPY");
		});
	});

	describe("equals", () => {
		it("should return true for equal prices", () => {
			const price1 = createPrice(1000, "JPY", 1500, 33, 100);
			const price2 = createPrice(1000, "JPY", 1500, 33, 100);
			expect(price1.equals(price2)).toBe(true);
		});

		it("should return false for different prices", () => {
			const price1 = createPrice(1000, "JPY");
			const price2 = createPrice(2000, "JPY");
			expect(price1.equals(price2)).toBe(false);
		});

		it("should return false for different currencies", () => {
			const price1 = createPrice(1000, "JPY");
			const price2 = createPrice(1000, "USD");
			expect(price1.equals(price2)).toBe(false);
		});

		it("should handle undefined optional properties", () => {
			const price1 = createPrice(1000, "JPY");
			const price2 = createPrice(1000, "JPY", undefined, undefined, undefined);
			expect(price1.equals(price2)).toBe(true);
		});

		it("should return false for non-WorkPrice", () => {
			const price = createPrice(1000);
			expect(price.equals({} as any)).toBe(false);
		});
	});

	describe("withDiscount", () => {
		it("should create new price with discount", () => {
			const original = createPrice(1000);
			const discounted = original.withDiscount(30);

			expect(discounted.current).toBe(700);
			expect(discounted.original).toBe(1000);
			expect(discounted.discount).toBe(30);
		});

		it("should use provided original price", () => {
			const price = createPrice(1000);
			const discounted = price.withDiscount(50, 2000);

			expect(discounted.current).toBe(1000);
			expect(discounted.original).toBe(2000);
		});

		it("should preserve currency and points", () => {
			const original = createPrice(1000, "USD", undefined, undefined, 100);
			const discounted = original.withDiscount(20);

			expect(discounted.currency).toBe("USD");
			expect(discounted.point).toBe(100);
		});

		it("should floor discounted price", () => {
			const original = createPrice(999);
			const discounted = original.withDiscount(33); // 33% off 999 = 669.33

			expect(discounted.current).toBe(669); // Floored
		});
	});
});
