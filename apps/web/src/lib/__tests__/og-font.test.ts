import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMPlusRoundedSubset } from "../og-font";

describe("loadMPlusRoundedSubset", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("css2 の @font-face から TTF URL を抜き出してフォントバイナリを返す", async () => {
		const fontData = new ArrayBuffer(8);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				text: async () =>
					"@font-face { src: url(https://fonts.gstatic.com/s/mplus.ttf) format('truetype'); }",
			})
			.mockResolvedValueOnce({ arrayBuffer: async () => fontData });
		vi.stubGlobal("fetch", fetchMock);

		await expect(loadMPlusRoundedSubset(700, "ああAB")).resolves.toBe(fontData);

		// 1回目: 重複文字を除いたサブセット指定で css2 を取得している
		const cssUrl = fetchMock.mock.calls[0]?.[0] as string;
		expect(cssUrl).toContain("wght@700");
		expect(cssUrl).toContain(`text=${encodeURIComponent("あAB")}`);
		// 2回目: css から抜き出したフォント URL を取得している
		expect(fetchMock.mock.calls[1]?.[0]).toBe("https://fonts.gstatic.com/s/mplus.ttf");
	});

	it("css に TTF/OTF の src が無ければ例外を投げる（呼び出し側で縮退させる）", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				text: async () =>
					"@font-face { src: url(https://fonts.gstatic.com/s/mplus.woff2) format('woff2'); }",
			}),
		);

		await expect(loadMPlusRoundedSubset(400, "あ")).rejects.toThrow(
			"OG画像用フォントのサブセット取得に失敗しました",
		);
	});
});
