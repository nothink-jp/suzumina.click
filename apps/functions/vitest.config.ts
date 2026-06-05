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
		server: {
			deps: {
				external: ["googleapis"],
				inline: ["cheerio", "css-select", "css-what", "cheerio-select", "domutils", "boolbase"],
			},
		},
		coverage: {
			// `vitest run`（= pnpm test / verify / CI）で常に閾値を強制する（SPR-151）
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "lcov", "clover"],
			reportsDirectory: "./coverage",
			exclude: [
				"node_modules/**",
				"lib/**",
				"vitest.*.{js,ts}",
				"**/*.d.ts",
				"**/*.config.{js,ts,mjs,cjs,mts,cts}",
				"src/development/**", // Development tools and debug scripts
				"src/tools/firestore-local/**", // ローカル Emulator のシード/ダンプ用 dev ツール
				"scripts/**", // Build scripts
			],
			// 現状の実測値を下限とするラチェット閾値（回帰ガード / SPR-152）。
			// branches は video-mapper 網羅で 69% まで改善。目標 75 へは後続増分で。
			thresholds: {
				statements: 75,
				branches: 67,
				functions: 82,
				lines: 75,
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@suzumina.click/shared-types": resolve(
				__dirname,
				"../../packages/shared-types/src/index.ts",
			),
		},
	},
});
