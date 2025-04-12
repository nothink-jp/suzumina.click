import type { NextConfig } from "next";

/**
 * Next.js アプリケーションの設定オブジェクト。
 *
 * @see https://nextjs.org/docs/api-reference/next.config.js/introduction
 */
const nextConfig: NextConfig = {
  /**
   * ビルド時にスタンドアロンの出力を生成します。
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/output
   */
  output: "standalone",
};

export default nextConfig;
