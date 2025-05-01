import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // ページとして扱うファイル拡張子を指定（stories.tsxを含めない）
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        // 必要に応じて pathname や port も指定可能
        // pathname: '/avatars/**',
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        // YouTubeのサムネイル画像用
      },
      // 他に許可したい外部ドメインがあればここに追加
    ],
  },
  // セキュリティヘッダー設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - YouTube IFrame API向けに設定
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com;
              frame-src 'self' https://www.youtube.com;
              connect-src 'self' https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
              img-src 'self' https: data:;
              style-src 'self' 'unsafe-inline';
              font-src 'self';
            `.replace(/\s+/g, ' ').trim()
          },
          // その他のセキュリティヘッダー
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
