import { describe, expect, it } from "vitest";
import { buildXShareUrl } from "../x-share";

describe("buildXShareUrl", () => {
	it("x.com の intent URL を生成し、text/url/hashtags を含む", () => {
		const url = new URL(buildXShareUrl("abc123", "ベイリース、来い"));

		expect(url.origin).toBe("https://x.com");
		expect(url.pathname).toBe("/intent/post");
		expect(url.searchParams.get("text")).toBe("「ベイリース、来い」");
		expect(url.searchParams.get("url")).toBe(
			"https://suzumina.click/buttons/abc123?utm_source=x&utm_medium=social",
		);
		expect(url.searchParams.get("hashtags")).toBe("涼花みなせ");
	});

	it("共有先 URL に X 流入判別用の utm が付与される", () => {
		const shared = new URL(new URL(buildXShareUrl("abc123", "テスト")).searchParams.get("url")!);

		expect(shared.pathname).toBe("/buttons/abc123");
		expect(shared.searchParams.get("utm_source")).toBe("x");
		expect(shared.searchParams.get("utm_medium")).toBe("social");
	});

	it("URL に影響する記号（& # ? =）を含むボタン名も壊れずエンコードされる", () => {
		const url = new URL(buildXShareUrl("id1", "A&B #tag ?= 100%"));

		expect(url.searchParams.get("text")).toBe("「A&B #tag ?= 100%」");
		// 他のパラメータが記号に侵食されないこと
		expect(url.searchParams.get("url")).toBe(
			"https://suzumina.click/buttons/id1?utm_source=x&utm_medium=social",
		);
		expect(url.searchParams.get("hashtags")).toBe("涼花みなせ");
	});
});
