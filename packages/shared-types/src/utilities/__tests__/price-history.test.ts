import { describe, expect, it } from "vitest";
import { formatPrice, getCurrencyInfo, SUPPORTED_CURRENCIES } from "../price-history";

describe("getCurrencyInfo", () => {
	it("既知の通貨コードは情報を返す", () => {
		expect(getCurrencyInfo("JPY")).toEqual(SUPPORTED_CURRENCIES[0]);
		expect(getCurrencyInfo("USD")?.symbol).toBe("$");
	});

	it("未知の通貨コードは undefined", () => {
		expect(getCurrencyInfo("XXX")).toBeUndefined();
	});
});

describe("formatPrice", () => {
	it("既知通貨はシンボル付きで桁区切り", () => {
		expect(formatPrice(1234567, "JPY")).toBe("¥1,234,567");
		expect(formatPrice(1000, "USD")).toBe("$1,000");
	});

	it("未知通貨はコードをシンボル代わりに使う", () => {
		expect(formatPrice(500, "XXX")).toBe("XXX500");
	});
});
