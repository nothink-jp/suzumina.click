import { afterEach, describe, expect, it, vi } from "vitest";

// vitest では "use cache" ディレクティブは no-op になり cacheLife が cache スコープ外呼び出しになるためモックする
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { loadMPlusRoundedSubset } from "../og-font";

const TTF_CSS =
	"@font-face { src: url(https://fonts.gstatic.com/s/mplus.ttf) format('truetype'); }";

/** 先頭4バイトが sfnt シグネチャ（TrueType outlines）の、フォントとして受理されるバイナリ */
function sfntBinary(): ArrayBuffer {
	const buffer = new ArrayBuffer(8);
	new DataView(buffer).setUint32(0, 0x00010000, false);
	return buffer;
}

/** Google Fonts がエラー時に返す HTML。satori はこれを Unsupported OpenType signature で弾く */
function htmlBinary(): ArrayBuffer {
	return new TextEncoder().encode("<!DOCTYPE html><html><body>error</body></html>").buffer;
}

describe("loadMPlusRoundedSubset", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("css2 の @font-face から TTF URL を抜き出してフォントバイナリを返す", async () => {
		const fontData = sfntBinary();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
			.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => fontData });
		vi.stubGlobal("fetch", fetchMock);

		await expect(loadMPlusRoundedSubset(700, "ああAB")).resolves.toBe(fontData);

		// 1回目: 重複文字を除いたサブセット指定で css2 を取得している
		const cssUrl = fetchMock.mock.calls[0]?.[0] as string;
		expect(cssUrl).toContain("wght@700");
		expect(cssUrl).toContain(`text=${encodeURIComponent("あAB")}`);
		// 2回目: css から抜き出したフォント URL を取得している
		expect(fetchMock.mock.calls[1]?.[0]).toBe("https://fonts.gstatic.com/s/mplus.ttf");
	});

	// fetch ごとに独立したタイムアウトを張ると待ち上限が 2 倍になるため、
	// 2 fetch が同一の deadline を共有していることを固定する
	it("css2 とフォントバイナリの fetch が同一の AbortSignal を共有する", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
			.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => sfntBinary() });
		vi.stubGlobal("fetch", fetchMock);

		await loadMPlusRoundedSubset(700, "あ");

		const first = fetchMock.mock.calls[0]?.[1]?.signal;
		const second = fetchMock.mock.calls[1]?.[1]?.signal;
		expect(first).toBeInstanceOf(AbortSignal);
		expect(second).toBe(first);
	});

	it("css に TTF/OTF の src が無ければ例外を投げる（呼び出し側で縮退させる）", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				text: async () =>
					"@font-face { src: url(https://fonts.gstatic.com/s/mplus.woff2) format('woff2'); }",
			}),
		);

		await expect(loadMPlusRoundedSubset(400, "あ")).rejects.toThrow(
			"OG画像用フォントのサブセット取得に失敗しました",
		);
	});

	it("css2 が 2xx 以外なら例外を投げる", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "<!DOCTYPE html>" }),
		);

		await expect(loadMPlusRoundedSubset(700, "あ")).rejects.toThrow("HTTP 429");
	});

	it("フォントバイナリの取得が 2xx 以外なら例外を投げる", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
				.mockResolvedValueOnce({ ok: false, status: 500, arrayBuffer: async () => htmlBinary() }),
		);

		await expect(loadMPlusRoundedSubset(700, "あ")).rejects.toThrow("HTTP 500");
	});

	// 本番 503 の再発防止: 200 で HTML が返るケースは arrayBuffer() が成功してしまうため、
	// シグネチャ検査が無いと非 null が cacheLife("max") で恒久キャッシュされ satori が描画中に落ちる
	it("フォント URL が 200 で HTML を返しても、フォントとして返さず例外を投げる", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
				.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => htmlBinary() }),
		);

		await expect(loadMPlusRoundedSubset(700, "あ")).rejects.toThrow(
			"OG画像用フォントの取得結果がフォントバイナリではありません",
		);
	});

	it("空レスポンスもフォントとして受理しない", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					arrayBuffer: async () => new ArrayBuffer(0),
				}),
		);

		await expect(loadMPlusRoundedSubset(700, "あ")).rejects.toThrow(
			"OG画像用フォントの取得結果がフォントバイナリではありません",
		);
	});

	it("OTTO（CFF outlines）シグネチャのフォントも受理する", async () => {
		const otto = new ArrayBuffer(8);
		new DataView(otto).setUint32(0, 0x4f54544f, false);
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200, text: async () => TTF_CSS })
				.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => otto }),
		);

		await expect(loadMPlusRoundedSubset(400, "あ")).resolves.toBe(otto);
	});
});
