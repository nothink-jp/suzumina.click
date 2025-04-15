import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  },
};

export default nextConfig;
