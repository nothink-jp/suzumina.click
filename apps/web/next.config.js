/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Cloud Run用に最適化された出力
  experimental: {
    // 最新のNext.js機能を有効化
    serverActions: {
      enabled: true
    },
  }
};

export default nextConfig;
