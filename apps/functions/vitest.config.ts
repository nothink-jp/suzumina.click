import { resolve } from "node:path";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// Functionsアプリケーションのテスト設定
export default defineConfig({
  test: {
    name: "functions",
    root: resolve(__dirname, "."),
    environment: "node",
    globals: true,
    testTimeout: 5000,
    include: ["src/**/*.{test,spec}.{ts,js}"],
    exclude: ["node_modules/**", "lib/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "clover"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "lib/**",
        "vitest.*.{js,ts}",
        "**/*.d.ts",
        "**/*.config.{js,ts,mjs,cjs,mts,cts}",
      ],
      thresholds: {
        statements: 80,
        branches: 70,
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
