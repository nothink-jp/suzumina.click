import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { calculatePriceInfo } from "../price-info";

const price = (p: Partial<WorkPlainObject["price"]>): WorkPlainObject["price"] =>
	({
		current: 0,
		currency: "JPY",
		isFree: false,
		isDiscounted: false,
		formattedPrice: "",
		...p,
	}) as WorkPlainObject["price"];

describe("calculatePriceInfo (SPR-187)", () => {
	it("セール中は current/original から割引率を算出する（price.discount は無視）", () => {
		const info = calculatePriceInfo(
			price({ current: 1100, original: 2200, discount: 99, isDiscounted: true }),
		);
		expect(info).toEqual({
			currentPrice: 1100,
			originalPrice: 2200,
			isOnSale: true,
			discountRate: 50,
		});
	});

	it("非セール時は originalPrice / discountRate が undefined", () => {
		const info = calculatePriceInfo(price({ current: 2200, original: 2200, isDiscounted: false }));
		expect(info.isOnSale).toBe(false);
		expect(info.originalPrice).toBeUndefined();
		expect(info.discountRate).toBeUndefined();
	});

	it("割引率は四捨五入される", () => {
		// (1980-1000)/1980 = 49.49% → 49
		const info = calculatePriceInfo(price({ current: 1000, original: 1980, isDiscounted: true }));
		expect(info.discountRate).toBe(49);
	});
});
