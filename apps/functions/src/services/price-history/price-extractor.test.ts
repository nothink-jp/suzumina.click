import { describe, expect, it } from "vitest";
import type { IndividualInfoAPIResponse } from "../dlsite/individual-info-to-work-mapper";
import { extractJPYPrice, isOnSale, isValidPriceData } from "./price-extractor";

describe("価格抽出関数", () => {
	describe("extractJPYPrice", () => {
		it("セール中の場合：正しく定価とセール価格を返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				locale_price: { ja_JP: 1056 }, // セール価格
				official_price: 1760, // 定価
				discount_rate: 40,
				price: 1056,
			};

			const regularPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "regular");
			const discountPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "discount");

			expect(regularPrice).toBe(1760); // 定価（official_price）
			expect(discountPrice).toBe(1056); // セール価格（locale_price）
		});

		it("セールなしの場合：通常価格を返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				locale_price: { ja_JP: 1760 },
				official_price: undefined,
				discount_rate: 0,
				price: 1760,
			};

			const regularPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "regular");
			const discountPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "discount");

			expect(regularPrice).toBe(1760);
			expect(discountPrice).toBe(1760);
		});

		it("locale_priceが配列形式の場合", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				locale_price: [
					{ currency: "JPY", price: 1056 },
					{ currency: "USD", price: 10 },
				],
				official_price: 1760,
				discount_rate: 40,
			};

			const regularPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "regular");
			const discountPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "discount");

			expect(regularPrice).toBe(1760);
			expect(discountPrice).toBe(1056);
		});

		it("フォールバック：直接価格を使用", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				locale_price: undefined,
				official_price: 1760,
				discount_rate: 40,
				price: 1056,
			};

			const regularPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "regular");
			const discountPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "discount");

			expect(regularPrice).toBe(1760); // official_price優先
			expect(discountPrice).toBe(1056); // price使用
		});

		it("official_priceがない場合はlocale_priceを使用", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				locale_price: { ja_JP: 1056 },
				official_price: undefined,
				discount_rate: 40,
				price: 1056,
			};

			const regularPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "regular");
			const discountPrice = extractJPYPrice(apiResponse as IndividualInfoAPIResponse, "discount");

			expect(regularPrice).toBe(1056); // official_priceがないのでlocale_priceを使用
			expect(discountPrice).toBe(1056);
		});
	});

	describe("isOnSale", () => {
		it("discount_rate > 0 の場合はtrueを返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				discount_rate: 40,
			};

			expect(isOnSale(apiResponse as IndividualInfoAPIResponse)).toBe(true);
		});

		it("discount_rate = 0 の場合はfalseを返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				discount_rate: 0,
			};

			expect(isOnSale(apiResponse as IndividualInfoAPIResponse)).toBe(false);
		});

		it("discount_rateが未定義の場合はfalseを返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {};

			expect(isOnSale(apiResponse as IndividualInfoAPIResponse)).toBe(false);
		});
	});

	describe("isValidPriceData", () => {
		it("有効な価格データがある場合はtrueを返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {
				price: 1760,
				locale_price: { ja_JP: 1760 },
			};

			expect(isValidPriceData(apiResponse as IndividualInfoAPIResponse)).toBe(true);
		});

		it("価格データがない場合はfalseを返す", () => {
			const apiResponse: Partial<IndividualInfoAPIResponse> = {};

			expect(isValidPriceData(apiResponse as IndividualInfoAPIResponse)).toBe(false);
		});
	});
});
