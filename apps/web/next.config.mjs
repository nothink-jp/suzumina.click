/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@suzumina.click/ui"],

  // Cloud Run向けのstandaloneビルド設定
  output: "standalone",

  // Server ComponentsでのみGoogle Cloud SDKを使用するための設定
  serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage"],

  // Core Web Vitals最適化
  experimental: {
    // React Compiler（実験的）
    reactCompiler: true,
  },

  // Turbopack設定
  turbopack: {
    rules: {
      "*.svg": ["@svgr/webpack"],
    },
  },

  // 画像最適化
  images: {
    // 画像形式の最適化
    formats: ["image/webp", "image/avif"],
    // 画像サイズの最適化
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 外部画像ドメインの許可（YouTubeサムネイル・DLsite画像用）
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
      };
    }
    return config;
  },

  // パフォーマンス最適化
  compress: true,

  // SWCコンパイラーはNext.js 15でデフォルト有効

  // 静的ファイルの最適化
  assetPrefix: process.env.NODE_ENV === "production" ? undefined : undefined,

  // ヘッダー最適化
  async headers() {
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

export default nextConfig;
