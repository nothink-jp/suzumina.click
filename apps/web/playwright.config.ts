import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./e2e",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		/* Take screenshot on failure */
		screenshot: "only-on-failure",

		/* Record video on failure */
		video: "retain-on-failure",
	},

	/* CI（e2e-smoke）が回すのは chromium のみ。firefox / webkit / Mobile project は
	 * 削除した手動 spec 群の名残で実行経路ゼロだったため撤去（SPR-202）。
	 * クロスブラウザ確認が必要になったら project を再追加する。 */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	/* テスト前にローカルサーバを起動する。
	 * PLAYWRIGHT_PROD=1 のときは本番ビルド(next start)に対して実行する。
	 * SPR-124 のような「本番ビルドでのみ顕在化する回帰」は dev では捕捉できないため、
	 * スモーク(@smoke / e2e/smoke.spec.ts)はこのモードで回す（事前に `next build` 済みであること）。
	 * 残った smoke はデータ非依存（layout/routing のみ・データ取得失敗は error 境界に落ちる）なので、
	 * 既定の `pnpm dev` は ADC 無しでも成立する（本番データ前提だった手動 spec は SPR-202 で撤去済み）。 */
	webServer: {
		command: process.env.PLAYWRIGHT_PROD ? "pnpm start" : "pnpm dev",
		url: "http://127.0.0.1:3000",
		reuseExistingServer: !process.env.CI,
		// 本番モードは起動のみ(ビルドは事前)だが余裕を持たせる
		timeout: (process.env.PLAYWRIGHT_PROD ? 180 : 120) * 1000,
	},
});
