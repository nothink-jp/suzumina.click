import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config.mjs";
import { ALLOWED_IMAGE_PATTERNS, isOptimizableImageSrc, normalizeImageUrl } from "../image-src";

describe("normalizeImageUrl", () => {
	it("プロトコル相対URLをhttpsに変換する", () => {
		expect(normalizeImageUrl("//img.dlsite.jp/resize/images2/a.jpg")).toBe(
			"https://img.dlsite.jp/resize/images2/a.jpg",
		);
	});

	it("httpをhttpsに変換する", () => {
		expect(normalizeImageUrl("http://img.dlsite.jp/resize/images2/a.jpg")).toBe(
			"https://img.dlsite.jp/resize/images2/a.jpg",
		);
	});

	it("空文字・非文字列は空文字を返す", () => {
		expect(normalizeImageUrl("")).toBe("");
		expect(normalizeImageUrl("   ")).toBe("");
		expect(normalizeImageUrl(undefined as unknown as string)).toBe("");
	});
});

describe("isOptimizableImageSrc", () => {
	it("許可ホスト・許可パスのURLを通す", () => {
		expect(
			isOptimizableImageSrc("https://img.dlsite.jp/modpub/images2/work/doujin/RJ01/x_img_main.jpg"),
		).toBe(true);
		expect(isOptimizableImageSrc("https://i.ytimg.com/vi/abc/maxresdefault.jpg")).toBe(true);
		expect(isOptimizableImageSrc("https://cdn.discordapp.com/avatars/1/2.png")).toBe(true);
	});

	it("DLsiteの「画像なし」プレースホルダを弾く", () => {
		// 実データに存在する（本番 works で 39 件）。許可ホスト外なので next/image に渡すと
		// 開発時は throw、本番は /_next/image が 400 を返す。
		expect(isOptimizableImageSrc("https://www.dlsite.com/images/web/home/no_img_sam.gif")).toBe(
			false,
		);
		expect(isOptimizableImageSrc("https://www.dlsite.com/images/web/home/no_img_main.gif")).toBe(
			false,
		);
	});

	it("許可ホストでもパスが許可外なら弾く", () => {
		expect(isOptimizableImageSrc("https://img.dlsite.jp/other/a.jpg")).toBe(false);
	});

	it("http・プロトコル相対・不正URLを弾く", () => {
		expect(isOptimizableImageSrc("http://img.dlsite.jp/resize/images2/a.jpg")).toBe(false);
		expect(isOptimizableImageSrc("//img.dlsite.jp/resize/images2/a.jpg")).toBe(false);
		expect(isOptimizableImageSrc("not a url")).toBe(false);
		expect(isOptimizableImageSrc("")).toBe(false);
	});

	it("data URIと自サイトの相対パスは通す", () => {
		expect(isOptimizableImageSrc("data:image/svg+xml;base64,AAA")).toBe(true);
		expect(isOptimizableImageSrc("/cherry-blossom.svg")).toBe(true);
	});
});

describe("ALLOWED_IMAGE_PATTERNS と next.config.mjs の一致", () => {
	// 正本は next.config.mjs（Next 本体が読む設定）。写しがズレたらここで落とす。
	const remotePatterns = (
		nextConfig as { images?: { remotePatterns?: { hostname: string; pathname: string }[] } }
	).images?.remotePatterns;

	it("remotePatterns が読み取れる", () => {
		expect(remotePatterns?.length).toBeGreaterThan(0);
	});

	it("すべての remotePattern が ALLOWED_IMAGE_PATTERNS に存在する", () => {
		const derived = (remotePatterns ?? []).map((pattern) => ({
			hostname: pattern.hostname,
			// `/x/y/**` → `/x/y/`
			pathnamePrefix: pattern.pathname.replace(/\*+$/, ""),
		}));
		expect([...ALLOWED_IMAGE_PATTERNS]).toEqual(derived);
	});
});
