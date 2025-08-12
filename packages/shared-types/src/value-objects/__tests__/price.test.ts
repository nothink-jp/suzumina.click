import { describe, expect, it } from "vitest";
import { PriceComparison, PriceValueObject } from "../work/price";

describe("Price Value Object", () => {
	describe("Price creation and validation", () => {
		it("should create valid price", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.amount).toBe(1980);
				expect(result.value.currency).toBe("JPY");
			}
		});

		it("should validate amount is non-negative integer", () => {
			const negativeResult = PriceValueObject.create({
				amount: -100,
				currency: "JPY",
			});
			expect(negativeResult.isErr()).toBe(true);
			if (negativeResult.isErr()) {
				expect(negativeResult.error.message).toBe("Amount must be a non-negative integer");
			}

			const decimalResult = PriceValueObject.create({
				amount: 100.5,
				currency: "JPY",
			});
			expect(decimalResult.isErr()).toBe(true);
		});

		it("should validate currency format", () => {
			const lowerCaseResult = PriceValueObject.create({
				amount: 1000,
				currency: "jpy",
			});
			expect(lowerCaseResult.isErr()).toBe(true);
			if (lowerCaseResult.isErr()) {
				expect(lowerCaseResult.error.message).toBe(
					"Currency must be a 3-letter uppercase ISO 4217 code",
				);
			}

			const shortResult = PriceValueObject.create({
				amount: 1000,
				currency: "JP",
			});
			expect(shortResult.isErr()).toBe(true);

			const longResult = PriceValueObject.create({
				amount: 1000,
				currency: "JPYN",
			});
			expect(longResult.isErr()).toBe(true);

			const invalidCharsResult = PriceValueObject.create({
				amount: 1000,
				currency: "12Y",
			});
			expect(invalidCharsResult.isErr()).toBe(true);
		});

		it("should validate optional original price", () => {
			const validResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				original: 1000,
			});
			expect(validResult.isOk()).toBe(true);

			const negativeOriginalResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				original: -1000,
			});
			expect(negativeOriginalResult.isErr()).toBe(true);
			if (negativeOriginalResult.isErr()) {
				expect(negativeOriginalResult.error.message).toBe(
					"Original price must be a non-negative integer",
				);
			}

			const decimalOriginalResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				original: 1000.5,
			});
			expect(decimalOriginalResult.isErr()).toBe(true);
		});

		it("should validate discount percentage", () => {
			const validDiscountResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				discount: 20,
			});
			expect(validDiscountResult.isOk()).toBe(true);

			const negativeDiscountResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				discount: -10,
			});
			expect(negativeDiscountResult.isErr()).toBe(true);
			if (negativeDiscountResult.isErr()) {
				expect(negativeDiscountResult.error.message).toBe("Discount must be between 0 and 100");
			}

			const overMaxDiscountResult = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				discount: 101,
			});
			expect(overMaxDiscountResult.isErr()).toBe(true);
		});

		it("should validate point value", () => {
			const validPointResult = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
				point: 100,
			});
			expect(validPointResult.isOk()).toBe(true);

			const negativePointResult = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
				point: -50,
			});
			expect(negativePointResult.isErr()).toBe(true);
			if (negativePointResult.isErr()) {
				expect(negativePointResult.error.message).toBe("Point must be a non-negative integer");
			}

			const decimalPointResult = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
				point: 50.5,
			});
			expect(decimalPointResult.isErr()).toBe(true);
		});
	});

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const result = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: "JPY",
				original: 2500,
				discount: 20,
				point: 100,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.amount).toBe(1980);
				expect(result.value.currency).toBe("JPY");
				expect(result.value.original).toBe(2500);
				expect(result.value.discount).toBe(20);
				expect(result.value.point).toBe(100);
			}
		});

		it("should handle non-object input", () => {
			const result1 = PriceValueObject.fromPlainObject(null);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Price data must be an object");
			}

			const result2 = PriceValueObject.fromPlainObject("string");
			expect(result2.isErr()).toBe(true);

			const result3 = PriceValueObject.fromPlainObject(undefined);
			expect(result3.isErr()).toBe(true);
		});

		it("should validate required field types", () => {
			const result1 = PriceValueObject.fromPlainObject({
				amount: "1980", // Wrong type
				currency: "JPY",
			});
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe(
					"Price must have amount as number and currency as string",
				);
			}

			const result2 = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: 123, // Wrong type
			});
			expect(result2.isErr()).toBe(true);
		});

		it("should validate optional field types", () => {
			const result1 = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: "JPY",
				original: "2500", // Wrong type
			});
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Original price must be a number");
			}

			const result2 = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: "JPY",
				discount: "20", // Wrong type
			});
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toBe("Discount must be a number");
			}

			const result3 = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: "JPY",
				point: "100", // Wrong type
			});
			expect(result3.isErr()).toBe(true);
			if (result3.isErr()) {
				expect(result3.error.message).toBe("Point must be a number");
			}
		});

		it("should handle minimal valid object", () => {
			const result = PriceValueObject.fromPlainObject({
				amount: 1980,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.amount).toBe(1980);
				expect(result.value.currency).toBe("JPY");
				expect(result.value.original).toBeUndefined();
				expect(result.value.discount).toBeUndefined();
				expect(result.value.point).toBeUndefined();
			}
		});
	});

	describe("Price methods", () => {
		it("無料作品を正しく判定する", () => {
			const result = PriceValueObject.create({
				amount: 0,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const freePrice = result.value;
				expect(freePrice.isFree()).toBe(true);
				expect(freePrice.isDiscounted()).toBe(false);
			}
		});

		it("割引作品を正しく判定する", () => {
			const result = PriceValueObject.create({
				amount: 800,
				currency: "JPY",
				original: 1000,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const discountedPrice = result.value;
				expect(discountedPrice.isDiscounted()).toBe(true);
				expect(discountedPrice.discountAmount()).toBe(200);
				expect(discountedPrice.effectiveDiscountRate()).toBe(20);
			}
		});

		it("通常価格（割引なし）を正しく判定する", () => {
			const result = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const normalPrice = result.value;
				expect(normalPrice.isDiscounted()).toBe(false);
				expect(normalPrice.discountAmount()).toBe(0);
				expect(normalPrice.effectiveDiscountRate()).toBe(0);
			}
		});

		it("元価格が0の場合の割引率を正しく計算する", () => {
			const result = PriceValueObject.create({
				amount: 0,
				currency: "JPY",
				original: 0,
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const price = result.value;
				expect(price.effectiveDiscountRate()).toBe(0);
			}
		});

		it("価格を正しくフォーマットする", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const price = result.value;
				expect(price.format()).toMatch(/¥|￥/);
				expect(price.format()).toContain("1,980");
			}
		});

		it("USD価格を正しくフォーマットする", () => {
			const result = PriceValueObject.create({
				amount: 1500,
				currency: "USD",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const price = result.value;
				const formatted = price.format();
				expect(formatted).toContain("$");
				expect(formatted).toContain("1,500");
			}
		});
	});

	describe("ValidatableValueObject implementation", () => {
		it("should validate valid price", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toEqual([]);
			}
		});
	});

	describe("BaseValueObject implementation", () => {
		it("等価性を正しく判定する", () => {
			const price1Result = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
				point: 100,
			});

			const price2Result = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
				point: 100,
			});

			const price3Result = PriceValueObject.create({
				amount: 1000,
				currency: "USD",
				point: 100,
			});

			expect(price1Result.isOk()).toBe(true);
			expect(price2Result.isOk()).toBe(true);
			expect(price3Result.isOk()).toBe(true);

			if (price1Result.isOk() && price2Result.isOk() && price3Result.isOk()) {
				const price1 = price1Result.value;
				const price2 = price2Result.value;
				const price3 = price3Result.value;

				expect(price1.equals(price2)).toBe(true);
				expect(price1.equals(price3)).toBe(false);
			}
		});

		it("should return false for non-Price objects", () => {
			const result = PriceValueObject.create({
				amount: 1000,
				currency: "JPY",
			});

			if (result.isOk()) {
				expect(result.value.equals(null as any)).toBe(false);
				expect(result.value.equals("string" as any)).toBe(false);
				expect(result.value.equals({} as any)).toBe(false);
			}
		});

		it("should clone correctly", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
				original: 2500,
				discount: 20,
				point: 100,
			});

			if (result.isOk()) {
				const original = result.value;
				const cloned = original.clone();

				expect(cloned).not.toBe(original);
				expect(cloned.equals(original)).toBe(true);
				expect(cloned.amount).toBe(original.amount);
				expect(cloned.currency).toBe(original.currency);
				expect(cloned.original).toBe(original.original);
				expect(cloned.discount).toBe(original.discount);
				expect(cloned.point).toBe(original.point);
			}
		});

		it("should convert to plain object", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
				original: 2500,
				discount: 20,
				point: 100,
			});

			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					amount: 1980,
					currency: "JPY",
					original: 2500,
					discount: 20,
					point: 100,
				});
			}
		});

		it("should handle plain object with undefined optional fields", () => {
			const result = PriceValueObject.create({
				amount: 1980,
				currency: "JPY",
			});

			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					amount: 1980,
					currency: "JPY",
					original: undefined,
					discount: undefined,
					point: undefined,
				});
			}
		});
	});

	describe("PriceComparison utilities", () => {
		it("最安値を正しく取得する", () => {
			const price1 = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			const price2 = PriceValueObject.create({ amount: 800, currency: "JPY" });
			const price3 = PriceValueObject.create({ amount: 1200, currency: "JPY" });

			expect(price1.isOk()).toBe(true);
			expect(price2.isOk()).toBe(true);
			expect(price3.isOk()).toBe(true);

			if (price1.isOk() && price2.isOk() && price3.isOk()) {
				const prices = [price1.value, price2.value, price3.value];

				const lowest = PriceComparison.getLowest(prices);
				expect(lowest?.amount).toBe(800);
			}
		});

		it("最高値を正しく取得する", () => {
			const price1 = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			const price2 = PriceValueObject.create({ amount: 800, currency: "JPY" });
			const price3 = PriceValueObject.create({ amount: 1200, currency: "JPY" });

			expect(price1.isOk()).toBe(true);
			expect(price2.isOk()).toBe(true);
			expect(price3.isOk()).toBe(true);

			if (price1.isOk() && price2.isOk() && price3.isOk()) {
				const prices = [price1.value, price2.value, price3.value];

				const highest = PriceComparison.getHighest(prices);
				expect(highest?.amount).toBe(1200);
			}
		});

		it("空の配列から最安値・最高値を取得する", () => {
			const lowest = PriceComparison.getLowest([]);
			expect(lowest).toBeUndefined();

			const highest = PriceComparison.getHighest([]);
			expect(highest).toBeUndefined();
		});

		it("単一価格から最安値・最高値を取得する", () => {
			const priceResult = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			expect(priceResult.isOk()).toBe(true);

			if (priceResult.isOk()) {
				const prices = [priceResult.value];

				const lowest = PriceComparison.getLowest(prices);
				expect(lowest?.amount).toBe(1000);

				const highest = PriceComparison.getHighest(prices);
				expect(highest?.amount).toBe(1000);
			}
		});

		it("価格変動率を正しく計算する", () => {
			const oldPriceResult = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			const newPriceResult = PriceValueObject.create({ amount: 1200, currency: "JPY" });

			expect(oldPriceResult.isOk()).toBe(true);
			expect(newPriceResult.isOk()).toBe(true);

			if (oldPriceResult.isOk() && newPriceResult.isOk()) {
				const oldPrice = oldPriceResult.value;
				const newPrice = newPriceResult.value;

				const changeRate = PriceComparison.calculateChangeRate(oldPrice, newPrice);
				expect(changeRate).toBe(20);
			}
		});

		it("価格下落の変動率を正しく計算する", () => {
			const oldPriceResult = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			const newPriceResult = PriceValueObject.create({ amount: 800, currency: "JPY" });

			expect(oldPriceResult.isOk()).toBe(true);
			expect(newPriceResult.isOk()).toBe(true);

			if (oldPriceResult.isOk() && newPriceResult.isOk()) {
				const oldPrice = oldPriceResult.value;
				const newPrice = newPriceResult.value;

				const changeRate = PriceComparison.calculateChangeRate(oldPrice, newPrice);
				expect(changeRate).toBe(-20);
			}
		});

		it("元価格が0の場合の変動率を計算する", () => {
			const oldPriceResult = PriceValueObject.create({ amount: 0, currency: "JPY" });
			const newPriceResult = PriceValueObject.create({ amount: 1000, currency: "JPY" });

			expect(oldPriceResult.isOk()).toBe(true);
			expect(newPriceResult.isOk()).toBe(true);

			if (oldPriceResult.isOk() && newPriceResult.isOk()) {
				const oldPrice = oldPriceResult.value;
				const newPrice = newPriceResult.value;

				const changeRate = PriceComparison.calculateChangeRate(oldPrice, newPrice);
				expect(changeRate).toBe(0);
			}
		});

		it("異なる通貨での比較はエラーを投げる", () => {
			const jpyPriceResult = PriceValueObject.create({ amount: 1000, currency: "JPY" });
			const usdPriceResult = PriceValueObject.create({ amount: 10, currency: "USD" });

			expect(jpyPriceResult.isOk()).toBe(true);
			expect(usdPriceResult.isOk()).toBe(true);

			if (jpyPriceResult.isOk() && usdPriceResult.isOk()) {
				const jpyPrice = jpyPriceResult.value;
				const usdPrice = usdPriceResult.value;

				expect(() => {
					PriceComparison.calculateChangeRate(jpyPrice, usdPrice);
				}).toThrow("Cannot compare prices with different currencies");
			}
		});
	});
});
