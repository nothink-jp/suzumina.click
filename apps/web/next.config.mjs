/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // サーバーサイド専用のパッケージをクライアントサイドからexternalに指定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドではNode.js専用モジュールを外部依存として扱う
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        worker_threads: false,
        http2: false,
        perf_hooks: false,
        inspector: false,
        "pg-native": false,
      };
    }
    return config;
  },
  // Server ComponentsでのみGoogle Cloud SDKを使用するため、サーバーサイド専用の外部ライブラリを指定
  serverExternalPackages: [
    "@google-cloud/firestore",
    "google-auth-library",
    "google-gax",
    "gaxios",
  ],
};

export default nextConfig;
