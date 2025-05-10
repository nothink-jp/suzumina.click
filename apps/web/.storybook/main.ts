import { resolve } from "node:path";
import type { StorybookConfig } from "@storybook/experimental-nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/experimental-addon-test",
  ],
  framework: {
    name: "@storybook/experimental-nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    // パスエイリアスの設定
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": resolve(__dirname, "../src"),
        // Next.jsのコンポーネントをモック
        "next/image": resolve(__dirname, "../src/mocks/nextImageMock.tsx"),
        "next/link": resolve(__dirname, "../src/mocks/nextLinkMock.tsx"),
        "next/navigation": resolve(
          __dirname,
          "../src/mocks/nextNavigationMock.tsx",
        ),
        // アプリケーション固有のコンポーネントモック
        "@/components/ui/AuthButton": resolve(
          __dirname,
          "../src/mocks/authButtonMock.tsx",
        ),
        // Firebase関連のモック
        "@/lib/firebase/client": resolve(
          __dirname,
          "../src/mocks/firebaseClientMock.ts",
        ),
        "@/lib/firebase/AuthProvider": resolve(
          __dirname,
          "../src/mocks/authProviderMock.tsx",
        ),
      };
    }

    // Viteの最適化設定を調整
    if (!config.optimizeDeps) {
      config.optimizeDeps = {};
    }

    if (!config.optimizeDeps.exclude) {
      config.optimizeDeps.exclude = [];
    }

    // Next.js関連モジュールを最適化から除外
    config.optimizeDeps.exclude.push("next/image", "next/link");

    // モックされたコンポーネントを対象に追加
    if (!config.optimizeDeps.include) {
      config.optimizeDeps.include = [];
    }

    return config;
  },
};
export default config;
