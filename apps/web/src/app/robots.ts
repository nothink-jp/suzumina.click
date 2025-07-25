import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://suzumina.click"}/sitemap.xml`,
	};
}
