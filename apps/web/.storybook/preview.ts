import "./process-shim"; // processオブジェクトのモックを追加
import type { Preview } from "@storybook/react";
import "../src/app/globals.css"; // グローバルCSSをインポート

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
    },
  },
};

export default preview;
