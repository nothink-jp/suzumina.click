/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@suzumina.click/ui"],

  // Server ComponentsでのみGoogle Cloud SDKを使用するための設定
  serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage"],
};

export default nextConfig;
