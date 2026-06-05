import path from "node:path";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			// `vitest run`（= pnpm test / verify / CI）で常に閾値を強制する（SPR-151）
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "lcov"],
			exclude: [
				"node_modules/**",
				"**/*.d.ts",
				"**/*.config.{js,ts,mjs,cjs,mts,cts}",
				"**/index.ts", // re-export only
				"**/types/firestore/**", // firestore type definitions only
				"**/plain-objects/**", // plain object types only
			],
			// 実測フロアに合わせたラチェット閾値（回帰ガード / SPR-152）。
			// 4 指標すべて目標 80 を達成済み（実測 st89/br80/fn90/ln90）。
			thresholds: {
				statements: 87,
				branches: 78,
				functions: 88,
				lines: 88,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
