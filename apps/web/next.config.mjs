import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@suzumina.click/ui", "@suzumina.click/shared-types"],

	// Cloud Run向けのstandaloneビルド設定
	output: "standalone",

	// Server ComponentsでのみGoogle Cloud SDKを使用するための設定
	serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage", "resend"],

	// コンパイラー最適化
	compiler: {
		// 本番環境でのコンソール除去
		removeConsole: process.env.NODE_ENV === "production",
	},

	// React Compiler（Next.js 16対応）
	reactCompiler: true,

	// Cache Components（Next.js 16 で PPR を置き換えた新モデル）
	// 静的シェルは prerender し、動的部分は `<Suspense>` 境界でストリーミング
	cacheComponents: true,

	// 実験的機能・パフォーマンス最適化
	experimental: {
		// App Router最適化
		optimizePackageImports: ["lucide-react", "zod", "react-hook-form", "sonner"],
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
		// 許可する quality 値（Next.js 16 以降は既定 [75] のみ。未設定値は警告になる）
		// アプリで使用する値: avatar 75 / card 通常 80 / thumbnail 85 / card priority 90
		qualities: [75, 80, 85, 90],
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

	// SWCコンパイラーはデフォルトで有効

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
							"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://ssl.google-analytics.com https://www.youtube.com https://s.ytimg.com https://discord.com https://static.cloudflareinsights.com",
							"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com",
							"font-src 'self' https://fonts.gstatic.com",
							"img-src 'self' data: https: blob:",
							"connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://www.youtube.com https://i.ytimg.com https://api.github.com https://discord.com https://fonts.googleapis.com https://fonts.gstatic.com https://cloudflareinsights.com",
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
			// 動的ページのstale-while-revalidate（LCP改善）
			// force-dynamicページでもブラウザキャッシュを活用
			{
				source: "/creators/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=60, stale-while-revalidate=300",
					},
				],
			},
			{
				source: "/circles/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=60, stale-while-revalidate=300",
					},
				],
			},
			// Cloudflare CDN向けキャッシュ設定
			{
				source: "/_next/static/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
			{
				// ホームページ: PPR 動的セクションの鮮度確保 (SLA < 1 分) のため短めの TTL。
				// Cloudflare 側 Cache Rule (terraform/cloudflare.tf) と同じ 60 秒に揃える。
				// stale-while-revalidate は付けない:
				//   - Cloudflare の Cache Rule では解釈されない (edge_ttl で別途指定済み)
				//   - max-age がないためブラウザでも実質効かない
				// CDN/ブラウザどちらにも明確に「60 秒で fresh、超過後は origin に問い合わせ」を伝える
				source: "/",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=60",
					},
				],
			},
			// 公開コンテンツの「一覧」ページはエッジキャッシュ可（SPR-221）。
			{
				source: "/(buttons|videos|works)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=120, stale-while-revalidate=300",
					},
				],
			},
			// 認証必須・セッション依存ページは CDN エッジでキャッシュさせない
			{
				source: "/(admin|settings|favorites|users)/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "private, no-store",
					},
				],
			},
			// videos/works の「詳細」は SPR-226 恒久解で per-user 状態を client island へ隔離し
			// session を SSR で読まなくなったため public へ復帰（SPR-221 のエッジキャッシュ効果を回復）:
			//   - /works/[id]:  WorkEvaluation が getWorkEvaluation を client self-fetch
			//   - /videos/[id]: RelatedAudioButtons が useAudioButtonStatuses で client 一括取得
			// CF 側（terraform/cloudflare.tf rule#5）は既に /works/・/videos/ を respect_origin で含むため
			// origin を public に戻すだけで自動キャッシュされる（CF 無変更）。
			// 前提: これら詳細は session-free を維持すること（origin ヘッダが唯一の防御線）。
			{
				source: "/(videos|works)/:path+",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=120, stale-while-revalidate=300",
					},
				],
			},
			// buttons の認証必須ページは CDN エッジでキャッシュさせない:
			//   - /buttons/create:   音声ボタン作成（ProtectedRoute）
			//   - /buttons/[id]/edit: 音声ボタン編集（認証必須）
			{
				source: "/buttons/create",
				headers: [
					{
						key: "Cache-Control",
						value: "private, no-store",
					},
				],
			},
			{
				source: "/buttons/:id/edit",
				headers: [
					{
						key: "Cache-Control",
						value: "private, no-store",
					},
				],
			},
			// buttons の「詳細」は SPR-223 で純公開 shell + client island 化し session を SSR で読まなくなったため
			// public へ復帰（SPR-222 stopgap を解除し SPR-221 のエッジキャッシュ効果を回復）。
			// :id((?!create$)[^/]+) ＝ 1 セグメント詳細から create を除外し、create-private と二重一致させない。
			{
				source: "/buttons/:id((?!create$)[^/]+)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=120, stale-while-revalidate=300",
					},
				],
			},
			{
				source: "/api/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store",
					},
				],
			},
		];
	},
};

export default withBundleAnalyzer(nextConfig);
