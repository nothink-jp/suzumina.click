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
			// SPR-197 で transformers の死蔵（work toFirestore / audio-button 操作群 / work-conversions）と
			// genre 正規化の重複を一掃し、分母が締まって全指標が回復（実測 st94 / br78 / fn92 / ln94）。
			// それに合わせてラチェットを引き上げ（SPR-181/198 で一時的に下げた br74 から復帰）。
			thresholds: {
				statements: 90,
				branches: 78,
				functions: 90,
				lines: 92,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
