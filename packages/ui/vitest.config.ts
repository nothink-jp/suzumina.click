/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
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
			],
			// カバレッジレポート形式
			reporter: ["text", "html", "lcov"],
			// カバレッジ閾値（必要に応じて調整）
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 80,
				lines: 80,
			},
		},
	},
});
