/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Vitest 3.1.1設定
// プロジェクト配列を直接定義してワークスペース機能を使用
export default defineConfig({
  plugins: [react()],
  test: {
    name: "root",
    root: ".",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 5000,
    // テスト対象ファイルを明示的に指定
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // テスト対象から除外するパターン
    exclude: ["functions/**", "node_modules/**", ".next/**", ".firebase/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        ".next/**",
        ".firebase/**",
        "vitest.*.{js,ts}",
        "**/*.d.ts",
        "**/*.config.{js,ts,mjs,cjs,mts,cts}",
        "**/*.stories.{jsx,tsx,mdx}",
        "**/dist/**",
        "**/.storybook/**",
        "functions/**",
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
