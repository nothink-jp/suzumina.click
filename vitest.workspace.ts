import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineWorkspace, defineConfig } from "vitest/config";

// ディレクトリパスの取得
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Vitest ワークスペース設定
// 詳細: https://vitest.dev/guide/workspace.html
export default defineWorkspace([
  // ルートプロジェクトのテスト設定
  "vitest.config.ts",

  // Functions プロジェクトのテスト設定
  defineConfig({
    test: {
      name: "functions",
      root: "./functions",
      environment: "node",
      include: ["./src/**/*.test.ts"],
      // @mdx-js/react の依存関係エラーを回避
      deps: {
        optimizer: {
          web: {
            exclude: ["@mdx-js/react"],
          },
        },
      },

      // カバレッジ設定
      // .clinerules で指定された80%の閾値を設定
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        reportsDirectory: "../coverage/functions",
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  }),

  /*
   * Storybook テストは一時的に無効化
   * Playwright がインストールされていないため、テストを実行できません
   * 必要になったら以下のコメントを解除し、Playwright をインストールしてください
   */
  /*
  {
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }]
      },
      setupFiles: ['.storybook/vitest.setup.ts'],
    },
  },
  */
]);
