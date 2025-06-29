/** @type {import('next').NextConfig} */
const nextConfig = {
	// 本番用設定
	output: "standalone",

	// 外部パッケージの最適化
	transpilePackages: ["@suzumina.click/shared-types", "@suzumina.click/ui"],

	// 実験的機能
	experimental: {
		// Server Components のストリーミング最適化
		ppr: false,
		// Server Actions 有効化
		serverActions: {
			allowedOrigins: ["admin.suzumina.click", "localhost:3000"],
		},
	},

	// 画像最適化（管理者アプリ用に調整）
	images: {
		domains: ["cdn.discordapp.com", "img.youtube.com"], // cSpell:ignore discordapp
		formats: ["image/webp", "image/avif"],
	},

	// セキュリティヘッダー
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff", // cSpell:ignore nosniff
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{
						key: "Content-Security-Policy",
						value:
							"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' data:; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000; includeSubDomains; preload",
					},
				],
			},
		];
	},
};

export default nextConfig;
