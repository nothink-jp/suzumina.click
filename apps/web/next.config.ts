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

  /**
   * 環境変数の設定
   * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
   */
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "",
  },

  /**
   * postgresをバンドルから除外し、実行時に利用できるようにします。
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイドのビルドでpostgresを外部依存として扱う
      config.externals = [...(config.externals || []), "postgres"];
    }
    return config;
  },
};

export default nextConfig;
