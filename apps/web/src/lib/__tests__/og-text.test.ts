import { describe, expect, it } from "vitest";

import {
	estimateTextWidth,
	formatDisplayTitle,
	stripUnsupportedGlyphs,
	truncateWithEllipsis,
} from "../og-text";

describe("truncateWithEllipsis", () => {
	it("max文字以内はそのまま返す", () => {
		const text = "あ".repeat(10);
		expect(truncateWithEllipsis(text, 10)).toBe(text);
	});

	it("maxを超えると末尾を省略記号にする", () => {
		const text = "あ".repeat(11);
		expect(truncateWithEllipsis(text, 10)).toBe(`${"あ".repeat(10)}…`);
	});
});

describe("estimateTextWidth", () => {
	it("全角は 1.0em、半角は 0.6em で概算する", () => {
		expect(estimateTextWidth("あいう", 56)).toBe(3 * 56);
		expect(estimateTextWidth("abc", 56)).toBe(Math.round(3 * 0.6 * 56));
	});
});

describe("stripUnsupportedGlyphs", () => {
	it("絵文字・異体字セレクタ・ZWJ合成絵文字を除去する", () => {
		expect(stripUnsupportedGlyphs("今日はどんなお客さんが来るかな…☕？")).toBe(
			"今日はどんなお客さんが来るかな…？",
		);
		expect(stripUnsupportedGlyphs("配信👨‍👩‍👧‍👦開始✌️です")).toBe("配信開始です");
	});

	it("連続空白を1つに畳む", () => {
		expect(stripUnsupportedGlyphs("A  B　 C")).toBe("A B C");
	});
});

describe("formatDisplayTitle", () => {
	it("絵文字除去と省略を両方適用する", () => {
		const long = `${"あ".repeat(45)}☕`;
		expect(formatDisplayTitle(long, 40)).toBe(`${"あ".repeat(40)}…`);
	});

	it("空文字はそのまま空文字", () => {
		expect(formatDisplayTitle("", 40)).toBe("");
	});
});
