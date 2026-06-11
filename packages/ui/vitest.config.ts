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
			// `vitest run`（= pnpm test / verify / CI）で常に閾値を強制する（SPR-151）
			enabled: true,
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
			],
			// カバレッジレポート形式
			reporter: ["text", "html", "lcov"],
			// 実測フロアに合わせたラチェット閾値（回帰ガード / SPR-152）
			thresholds: {
				statements: 72,
				branches: 67,
				functions: 66,
				lines: 72,
			},
		},
	},
});
