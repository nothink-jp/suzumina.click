import { resolve } from "node:path";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@suzumina.click/shared-types": resolve(__dirname, "../shared-types/src/index.ts"),
		},
	},
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			// カバレッジ対象ファイルを明示的に指定
			include: [
				"src/components/custom/**/*.{ts,tsx}", // カスタムコンポーネントのみ
				"src/hooks/**/*.{ts,tsx}",
				"src/lib/**/*.{ts,tsx}",
			],
			// カバレッジから除外するファイルパターン
			exclude: [
				// Storybookファイル
				"**/*.stories.{ts,tsx}",
				"**/*.story.{ts,tsx}",
				// テストファイル
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
				"**/__tests__/**",
				// 設定ファイル
				"**/*.config.{js,ts,mjs,cjs}",
				"**/vitest.setup.ts",
				"**/tailwind.config.*",
				"**/postcss.config.*",
				// ビルド成果物
				"**/dist/**",
				"**/build/**",
				"**/coverage/**",
				"**/storybook-static/**",
				"**/.storybook/**",
				// Node modules
				"**/node_modules/**",
				// その他
				"**/*.d.ts",
				"**/index.{ts,tsx}", // エクスポートのみのindexファイル
				"**/youtube-types.ts", // 型定義のみ
				"**/use-mobile.ts", // 未使用のユーティリティフック
			],
			// カバレッジレポート形式
			reporter: ["text", "html", "lcov"],
			// `vitest run`（= pnpm test / verify / CI）で常に閾値を強制する（SPR-151）
			enabled: true,
			// 現状の実測値を下限とするラチェット閾値（回帰ガード）。
			// 目標値への引き上げは SPR-152 で段階的に行う。
			thresholds: {
				statements: 57,
				branches: 51,
				functions: 57,
				lines: 59,
			},
		},
	},
});
