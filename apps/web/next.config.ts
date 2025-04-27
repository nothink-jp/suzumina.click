import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
};

export default nextConfig;
