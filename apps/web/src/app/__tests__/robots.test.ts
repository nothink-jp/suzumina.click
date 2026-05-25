import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "../robots";

describe("robots", () => {
	const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

	beforeEach(() => {
		delete process.env.NEXT_PUBLIC_APP_URL;
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.NEXT_PUBLIC_APP_URL;
		} else {
			process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
		}
	});

	it("MetadataRoute.Robots の構造を返す", () => {
		const result = robots();

		expect(result).toHaveProperty("rules");
		expect(result).toHaveProperty("sitemap");
		expect(result.rules).toMatchObject({
			userAgent: "*",
			allow: "/",
		});
		expect(Array.isArray((result.rules as { disallow: string[] }).disallow)).toBe(true);
	});

	it("disallow に管理・認証・内部パスが含まれる", () => {
		const result = robots();
		const disallow = (result.rules as { disallow: string[] }).disallow;

		// prefix match のワイルドカード表記。/admin* は /admin・/admin/* を、
		// /auth* は /auth・/auth/* をそれぞれカバーする (#413)。
		expect(disallow).toContain("/admin*");
		expect(disallow).toContain("/auth*");
		expect(disallow).toContain("/_next/");
		expect(disallow).toContain("/api/");
	});

	it("sitemap URL に NEXT_PUBLIC_APP_URL が反映される", () => {
		process.env.NEXT_PUBLIC_APP_URL = "https://staging.example.com";

		const result = robots();

		expect(result.sitemap).toBe("https://staging.example.com/sitemap.xml");
	});

	it("デフォルトで本番 URL の sitemap を返す", () => {
		const result = robots();

		expect(result.sitemap).toBe("https://suzumina.click/sitemap.xml");
	});
});
