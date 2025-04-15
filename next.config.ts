import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的エクスポートを有効化（Firebase Hostingと互換性を持たせるため）
  output: 'export',
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        // 必要に応じて pathname や port も指定可能
        // pathname: '/avatars/**',
      },
      // 他に許可したい外部ドメインがあればここに追加
    ],
    // 静的エクスポートの場合、unoptimizedを設定
    unoptimized: true,
  },
  /* 他の config options があればここに追加 */
};

export default nextConfig;
