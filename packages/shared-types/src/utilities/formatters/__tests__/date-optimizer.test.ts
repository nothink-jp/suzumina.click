import { describe, expect, it } from "vitest";
import { optimizeDateFormats } from "../date-optimizer";

describe("optimizeDateFormats", () => {
	it("日本語表記: original / iso(ISO timestamp) / display(年月日) を返す", () => {
		const result = optimizeDateFormats("2023年3月5日");
		expect(result?.original).toBe("2023年3月5日");
		expect(result?.display).toBe("2023年3月5日");
		// iso は new Date(y, m-1, d).toISOString()（ローカルタイム基準・従来挙動）
		expect(result?.iso).toBe(new Date(2023, 2, 5).toISOString());
	});

	it("ISO / スラッシュ入力も年月日 display に整形する", () => {
		expect(optimizeDateFormats("2023-03-05")?.display).toBe("2023年3月5日");
		expect(optimizeDateFormats("2023/03/05")?.display).toBe("2023年3月5日");
	});

	it("パターン外は Date コンストラクタにフォールバックする", () => {
		expect(optimizeDateFormats("March 5, 2023")?.display).toBe("2023年3月5日");
	});

	it("パースできない場合は null", () => {
		expect(optimizeDateFormats("わからない")).toBeNull();
	});
});
