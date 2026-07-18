import { describe, expect, it, vi } from "vitest";

// opengraph-image.tsx は next/og と Firestore 依存の action を import するため、
// 純関数（truncate / 字幅概算 / タイトル整形）のテストに必要な分だけモックする
vi.mock("next/og", () => ({ ImageResponse: class {} }));
vi.mock("@/app/buttons/actions", () => ({ getAudioButtonById: vi.fn() }));
// vitest では "use cache" ディレクティブは no-op になり cacheLife が cache スコープ外呼び出しになるためモックする
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { estimateTextWidth, formatVideoTitle, truncateButtonText } from "../opengraph-image";

describe("truncateButtonText", () => {
	it("52字以内はそのまま返す", () => {
		const text = "あ".repeat(52);
		expect(truncateButtonText(text)).toBe(text);
	});

	it("52字を超えると末尾を省略記号にする", () => {
		const text = "あ".repeat(53);
		expect(truncateButtonText(text)).toBe(`${"あ".repeat(52)}…`);
		expect(truncateButtonText(text).length).toBe(53);
	});
});

describe("estimateTextWidth", () => {
	it("全角は 1.0em、半角は 0.6em で概算する", () => {
		expect(estimateTextWidth("あいう", 56)).toBe(3 * 56);
		expect(estimateTextWidth("abc", 56)).toBe(Math.round(3 * 0.6 * 56));
	});

	it("折り返し閾値の境界: 全角13字は 750px 以内・14字で超過（56px時）", () => {
		expect(estimateTextWidth("あ".repeat(13), 56)).toBeLessThanOrEqual(750);
		expect(estimateTextWidth("あ".repeat(14), 56)).toBeGreaterThan(750);
	});
});

describe("formatVideoTitle", () => {
	it("絵文字（フォント外グリフ）を除去する", () => {
		expect(formatVideoTitle("今日はどんなお客さんが来るかな…☕？")).toBe(
			"今日はどんなお客さんが来るかな…？",
		);
	});

	it("ZWJ 合成絵文字・異体字セレクタも除去する", () => {
		expect(formatVideoTitle("配信👨‍👩‍👧‍👦開始✌️です")).toBe("配信開始です");
	});

	it("連続空白を1つに畳み、40字を超えると省略する", () => {
		expect(formatVideoTitle("A  B　 C")).toBe("A B C");
		const long = "あ".repeat(45);
		expect(formatVideoTitle(long)).toBe(`${"あ".repeat(40)}…`);
	});

	it("空文字はそのまま空文字", () => {
		expect(formatVideoTitle("")).toBe("");
	});
});
