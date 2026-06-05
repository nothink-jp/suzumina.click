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
	// toLocaleString() の桁区切りはロケール依存のため、シンボル + 数字（区切り除去）で検証する
	const digitsOf = (s: string) => s.replace(/[^\d]/g, "");

	it("既知通貨はシンボルを前置する", () => {
		const jpy = formatPrice(1234567, "JPY");
		expect(jpy.startsWith("¥")).toBe(true);
		expect(digitsOf(jpy)).toBe("1234567");

		expect(formatPrice(1000, "USD").startsWith("$")).toBe(true);
	});

	it("未知通貨はコードをシンボル代わりに使う", () => {
		expect(formatPrice(500, "XXX")).toBe("XXX500");
	});
});
