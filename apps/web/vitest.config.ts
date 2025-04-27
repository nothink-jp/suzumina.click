import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// webアプリケーションのテスト設定
export default defineConfig({
  plugins: [react()],
  test: {
    name: "web",
    // monorepoの場合、ルートディレクトリを指定
    root: resolve(__dirname, "."),
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 5000,
    // テスト対象ファイルを明示的に指定
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // テスト対象から除外するパターン
    exclude: ["node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        ".next/**",
        "vitest.*.{js,ts}",
        "**/*.d.ts",
        "**/*.config.{js,ts,mjs,cjs,mts,cts}",
        "**/*.stories.{jsx,tsx,mdx}",
        "**/dist/**",
        "**/.storybook/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
