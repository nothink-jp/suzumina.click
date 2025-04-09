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
  typescript: {
    /**
     * CI 環境でのみビルド時の TypeScript エラーを無視します。
     * 注意: このオプションは型チェックを CI パイプラインで別途実行している場合にのみ有効にしてください。
     * @see https://nextjs.org/docs/app/api-reference/next-config-js/typescript#ignorebuilderrors
     */
    ignoreBuildErrors: process.env.CI === "true",
  },
};

export default nextConfig;
