import { afterEach, describe, expect, it, vi } from "vitest";

import { loadRemoteImageDataUri } from "../og-remote-image";

describe("loadRemoteImageDataUri", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("許可ホストの画像を取得して data URI に変換する", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers({ "content-type": "image/png" }),
			}),
		);

		const result = await loadRemoteImageDataUri("https://img.example.com/a.png", [
			"img.example.com",
		]);

		expect(result).toMatch(/^data:image\/png;base64,/);
	});

	it("content-type ヘッダが無い場合は image/jpeg にフォールバックする", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers(),
			}),
		);

		const result = await loadRemoteImageDataUri("https://img.example.com/a.jpg", [
			"img.example.com",
		]);

		expect(result).toMatch(/^data:image\/jpeg;base64,/);
	});

	it("許可外ホストは fetch せず null を返す", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await loadRemoteImageDataUri("https://evil.example.com/a.png", [
			"img.example.com",
		]);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it("レスポンスが ok でない場合は null を返す", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers(),
			}),
		);

		const result = await loadRemoteImageDataUri("https://img.example.com/missing.png", [
			"img.example.com",
		]);

		expect(result).toBeNull();
	});

	it("fetch が例外を投げても null を返す（500にしない）", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

		const result = await loadRemoteImageDataUri("https://img.example.com/a.png", [
			"img.example.com",
		]);

		expect(result).toBeNull();
	});

	it("不正なURLでも例外を投げず null を返す", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await loadRemoteImageDataUri("not-a-url", ["img.example.com"]);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});
});
