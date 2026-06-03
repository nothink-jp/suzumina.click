import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
/// <reference types="vitest" />
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dir = dirname(fileURLToPath(import.meta.url));

/**
 * Storybook の story を play(interaction)/a11y テストとして browser モードで実行する設定（SPR-121）。
 * coverage を gating する通常の vitest.config.ts とは分離し、`pnpm test:storybook` / CI で別途回す。
 * 本番ビルド限定回帰は e2e スモーク（SPR-125）が担い、ここは story 単位の振る舞い・a11y を担保する。
 */
export default defineConfig({
	resolve: {
		alias: {
			"@suzumina.click/shared-types": resolve(dir, "../shared-types/src/index.ts"),
		},
	},
	plugins: [storybookTest({ configDir: resolve(dir, ".storybook") })],
	test: {
		name: "storybook",
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			instances: [{ browser: "chromium" }],
		},
		setupFiles: [resolve(dir, ".storybook/vitest.setup.ts")],
	},
});
