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
				"**/youtube-types.ts", // 型定義のみ
				"**/use-mobile.ts", // 未使用のユーティリティフック
			],
			// カバレッジレポート形式
			reporter: ["text", "html", "lcov"],
			// カバレッジ閾値（品質を担保しつつ実用的な範囲で設定）
			thresholds: {
				statements: 70, // 新しいコンポーネント追加を考慮
				branches: 65, // 複雑な条件分岐の多いコンポーネント対応
				functions: 40, // AudioButton削除後の現実的な閾値
				lines: 70, // 実装済み機能の主要パスをカバー
			},
		},
	},
});
