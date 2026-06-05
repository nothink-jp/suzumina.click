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
			// 現状の実測値を下限とするラチェット閾値（回帰ガード）。
			// 目標値（80）への引き上げは SPR-152 で段階的に行う。
			thresholds: {
				statements: 72,
				branches: 63,
				functions: 77,
				lines: 72,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
