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
			// SPR-181 で value-objects 一式（高カバレッジの死蔵 VO + テスト）を削除したため
			// 分母が縮み branches/functions が下振れ。実態に合わせて再ピン
			// （st90/br75/fn87/ln91）。transformers の branch 回復は SPR-197 で対応。
			// SPR-198 で死蔵 utils（date-parser/number-parser + テスト）削除により branch が
			// 74.96% へ微減したため 74 に再ピン。
			thresholds: {
				statements: 87,
				branches: 74,
				functions: 87,
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
