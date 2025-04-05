import { defineConfig, devices } from '@playwright/test';
// import path from 'node:path'; // globalSetupを使用しないため不要

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

// const authFile = path.join(__dirname, 'playwright/.auth/user.json'); // 不要

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // globalSetup: require.resolve('./tests/e2e/global.setup'), // globalSetup を削除
  /* Run tests in files in parallel */
  fullyParallel: true, // 並列実行を有効に戻す
  workers: undefined, // デフォルトのワーカー数に戻す (CPUコア数に基づく)
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // storageState: authFile, // storageState を削除
      },
    },

    /* 他のブラウザ設定も storageState を削除 */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000, // タイムアウトは維持
  },
});