import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@suzumina.click/ui"],

	// Cloud Run向けのstandaloneビルド設定
	output: "standalone",

	// Server ComponentsでのみGoogle Cloud SDKを使用するための設定
	serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage", "resend"],

	// コンパイラー最適化
	compiler: {
		// 本番環境でのコンソール除去
		removeConsole: process.env.NODE_ENV === "production",
	},

	// 実験的機能・パフォーマンス最適化
	experimental: {
		// React Compiler（Next.js 15.3対応）
		reactCompiler: true,
		// App Router最適化
		optimizePackageImports: ["lucide-react", "date-fns", "zod", "react-hook-form", "sonner"],
		// 並列レンダリング最適化
		ppr: false, // Partial Prerendering（実験的）
		// ダイナミックインポート最適化
		optimizeServerReact: true,
		// Critical CSS自動抽出（LCP改善）- 実験的機能
		// optimizeCss: true, // critters依存関係の問題で一時的に無効化
	},

	// Turbopack設定（安定版）
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},

	// 画像最適化
	images: {
		// 画像形式の最適化（AVIF優先でWebPフォールバック）
		formats: ["image/avif", "image/webp"],
		// 画像サイズの最適化
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		// 高解像度画像対応のため制限を緩和
		unoptimized: false,
		// 外部画像ドメインの許可（YouTubeサムネイル・DLsite画像・Discord CDN用）
		remotePatterns: [
			{
				protocol: "https",
				hostname: "i.ytimg.com",
				port: "",
				pathname: "/vi/**",
			},
			{
				protocol: "https",
				hostname: "img.youtube.com",
				port: "",
				pathname: "/vi/**",
			},
			{
				protocol: "https",
				hostname: "img.dlsite.jp",
				port: "",
				pathname: "/resize/images2/**",
			},
			{
				protocol: "https",
				hostname: "img.dlsite.jp",
				port: "",
				pathname: "/modpub/images2/**",
			},
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
				port: "",
				pathname: "/avatars/**",
			},
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
				port: "",
				pathname: "/embed/avatars/**",
			},
		],
		// LCPを改善する画像の最適化
		minimumCacheTTL: 60 * 60 * 24 * 7, // 7日間キャッシュ
		dangerouslyAllowSVG: true,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},

	// バンドル最適化
	webpack: (config, { dev, isServer }) => {
		// プロダクションビルドでのバンドル最適化
		if (!dev && !isServer) {
			config.optimization.splitChunks.cacheGroups = {
				...config.optimization.splitChunks.cacheGroups,
				// UI コンポーネントを別チャンクに分離
				ui: {
					name: "ui",
					test: /[\\/]node_modules[\\/]@suzumina\.click[\\/]ui/,
					chunks: "all",
					priority: 10,
				},
				// Lucide アイコンを別チャンクに分離
				icons: {
					name: "icons",
					test: /[\\/]node_modules[\\/]lucide-react/,
					chunks: "all",
					priority: 10,
				},
				// React系を別チャンクに分離
				react: {
					name: "react",
					test: /[\\/]node_modules[\\/](react|react-dom)/,
					chunks: "all",
					priority: 10,
				},
				// date-fns を別チャンクに分離
				dateFns: {
					name: "date-fns",
					test: /[\\/]node_modules[\\/]date-fns/,
					chunks: "all",
					priority: 10,
				},
				// Form関連ライブラリを別チャンクに分離
				forms: {
					name: "forms",
					test: /[\\/]node_modules[\\/](react-hook-form|zod)/,
					chunks: "all",
					priority: 10,
				},
			};
		}
		return config;
	},

	// パフォーマンス最適化
	compress: true,
	// 静的最適化強化
	modularizeImports: {
		"lucide-react": {
			transform: "lucide-react/dist/esm/icons/{{member}}",
		},
	},

	// SWCコンパイラーはNext.js 15でデフォルト有効

	// 静的最適化・プリロード設定
	poweredByHeader: false,

	// ヘッダー最適化
	headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
					},
					{
						key: "Service-Worker-Allowed",
						value: "/",
					},
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://ssl.google-analytics.com https://www.youtube.com https://s.ytimg.com https://discord.com",
							"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com",
							"font-src 'self' https://fonts.gstatic.com",
							"img-src 'self' data: https: blob:",
							"connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://www.youtube.com https://i.ytimg.com https://api.github.com https://discord.com https://fonts.googleapis.com https://fonts.gstatic.com",
							"frame-src 'self' https://www.youtube.com https://discord.com https://www.google.com",
							"object-src 'none'",
							"base-uri 'self'",
							"frame-ancestors 'none'",
						].join("; "),
					},
				],
			},
			// 静的アセットの長期キャッシュ
			{
				source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
			// フォントファイルの最適化
			{
				source: "/(.*)\\.(woff|woff2|eot|ttf|otf)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
				],
			},
		];
	},
};

export default withBundleAnalyzer(nextConfig);
