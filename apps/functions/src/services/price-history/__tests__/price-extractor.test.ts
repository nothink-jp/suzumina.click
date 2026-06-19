import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { isValidPriceData } from "../price-extractor";

describe("価格抽出関数", () => {
	describe("isValidPriceData", () => {
		it("有効な価格データがある場合はtrueを返す", () => {
			const apiResponse: Partial<DLsiteApiResponse> = {
				price: 1760,
				locale_price: { ja_JP: 1760 },
			};

			expect(isValidPriceData(apiResponse as DLsiteApiResponse)).toBe(true);
		});

		it("価格データがない場合はfalseを返す", () => {
			const apiResponse: Partial<DLsiteApiResponse> = {};

			expect(isValidPriceData(apiResponse as DLsiteApiResponse)).toBe(false);
		});
	});
});
