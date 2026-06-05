import { describe, expect, it } from "vitest";
import { generateGridClasses } from "../classHelpers";

describe("generateGridClasses", () => {
	it("gridColumns 未指定は基本クラスのみ", () => {
		expect(generateGridClasses(undefined)).toBe("grid gap-6");
	});

	it("各ブレークポイントのカラム数をクラス化する", () => {
		const r = generateGridClasses({ default: 1, sm: 2, lg: 4 });
		expect(r).toContain("grid-cols-1");
		expect(r).toContain("sm:grid-cols-2");
		expect(r).toContain("lg:grid-cols-4");
	});

	it("範囲外(1未満/12超)のカラム数は無視する", () => {
		const r = generateGridClasses({ default: 0, sm: 13, md: 6 });
		expect(r).not.toContain("grid-cols-0");
		expect(r).not.toContain("sm:grid-cols-13");
		expect(r).toContain("md:grid-cols-6");
	});
});
