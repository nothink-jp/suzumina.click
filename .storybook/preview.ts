import type { Preview } from "@storybook/react";
import "../src/app/globals.css"; // グローバルCSSをインポート
import { createMockFn, initNextJsNavigationMock } from "./mock"; // モック関数をインポート

// Storybookのプレビュー設定
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Next.js App Routerのモックを設定
    nextjs: {
      appDirectory: true,
      navigation: {
        push: createMockFn<string, void>(),
        replace: createMockFn<string, void>(),
        prefetch: createMockFn<string, void>(),
        back: createMockFn<void, void>(),
        forward: createMockFn<void, void>(),
        refresh: createMockFn<void, void>(),
      },
    },
  },
};

// Next.jsのナビゲーションモックを初期化
initNextJsNavigationMock();

export default preview;
