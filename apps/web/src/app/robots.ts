import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://suzumina.click";
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/admin*", "/auth*", "/_next/", "/api/"],
		},
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
