import { defineConfig, devices } from "@playwright/test";

/* e2e の接続先モード:
 * - 既定: dev サーバ（`pnpm dev`）
 * - PLAYWRIGHT_PROD=1: 本番ビルド（next start）。事前に `next build` 済みであること。
 *   「本番ビルドでのみ顕在化する回帰」は dev では捕捉できないため、smoke はこのモードで回す。
 * - PLAYWRIGHT_EMULATOR=1: 本番ビルド × Firestore Emulator。データ依存 spec
 *   （e2e/data-smoke.spec.ts）が有効になる。Emulator 起動 + seed + build を含む
 *   ワンショットはリポジトリルートの `pnpm test:e2e:emulator`（scripts/e2e-emulator.sh）。
 */
const useEmulator = !!process.env.PLAYWRIGHT_EMULATOR;
const useProdServer = !!process.env.PLAYWRIGHT_PROD || useEmulator;

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
	 * 削除した手動 spec 群の名残で実行経路ゼロだったため撤去した。
	 * クロスブラウザ確認が必要になったら project を再追加する。 */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	/* テスト前にローカルサーバを起動する（モードはファイル冒頭のコメントを参照）。
	 * smoke.spec.ts はデータ非依存（layout/routing のみ・データ取得失敗は error 境界に落ちる）なので、
	 * 既定の `pnpm dev` は ADC 無しでも成立する（本番データ前提だった手動 spec は撤去済み）。 */
	webServer: {
		command: useProdServer ? "pnpm start" : "pnpm dev",
		url: "http://127.0.0.1:3000",
		reuseExistingServer: !process.env.CI,
		// 本番モードは起動のみ(ビルドは事前)だが余裕を持たせる
		timeout: (useProdServer ? 180 : 120) * 1000,
		// Emulator モードでは server プロセスへ接続先と安全弁の opt-in を必ず引き渡す
		// （firestore.ts は本番ビルド × Emulator を PLAYWRIGHT_EMULATOR=1 のときだけ許可する）
		...(useEmulator
			? {
					env: {
						FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080",
						PLAYWRIGHT_EMULATOR: "1",
					},
				}
			: {}),
	},
});
