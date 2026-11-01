import { describe, expect, it } from "vitest";
import { getClientIp } from "../client-ip";

const h = (values: Record<string, string>) => ({ get: (k: string) => values[k] ?? null });

describe("getClientIp", () => {
	it("cf-connecting-ip を x-forwarded-for より優先する", () => {
		expect(getClientIp(h({ "cf-connecting-ip": " 9.9.9.9 ", "x-forwarded-for": "6.6.6.6" }))).toBe(
			"9.9.9.9",
		);
	});

	it("無ければ x-forwarded-for の先頭", () => {
		expect(getClientIp(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
	});

	it("どちらも無ければ unknown", () => {
		expect(getClientIp(h({}))).toBe("unknown");
	});
});
