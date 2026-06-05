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
			// statements / lines / functions は目標 80 に到達済み。
			// branches は 71.3% まで改善（残りは後続増分で 80 を目指す）。
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 83,
				lines: 80,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
