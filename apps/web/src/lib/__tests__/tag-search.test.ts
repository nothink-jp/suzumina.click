import { describe, expect, it } from "vitest";
import { buildTagSearchHref } from "../tag-search";

describe("buildTagSearchHref", () => {
	const parse = (href: string) => new URL(href, "http://localhost").searchParams;

	it("playlist 層は playlistTags フィルターを付与する", () => {
		const params = parse(buildTagSearchHref("配信", "playlist"));
		expect(params.get("q")).toBe("配信");
		expect(params.get("type")).toBe("videos");
		expect(params.get("playlistTags")).toBe("配信");
		expect(params.get("userTags")).toBeNull();
		expect(params.get("categoryNames")).toBeNull();
	});

	it("user 層は userTags フィルターを付与する", () => {
		const params = parse(buildTagSearchHref("可愛い", "user"));
		expect(params.get("userTags")).toBe("可愛い");
		expect(params.get("playlistTags")).toBeNull();
	});

	it("category 層は categoryNames フィルターを付与する", () => {
		const params = parse(buildTagSearchHref("ゲーム", "category"));
		expect(params.get("categoryNames")).toBe("ゲーム");
	});

	it("先頭は /search で、特殊文字はエンコードされる", () => {
		const href = buildTagSearchHref("a&b c", "playlist");
		expect(href.startsWith("/search?")).toBe(true);
		expect(href).not.toContain("a&b c");
		expect(parse(href).get("q")).toBe("a&b c");
	});
});
