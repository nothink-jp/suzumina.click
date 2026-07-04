import { test } from "@playwright/test";

/**
 * Playwright Agents（planner/generator/healer）の環境 seed。
 * Emulator + fixtures（`pnpm dev:local` 相当）で起動したアプリに対し、
 * 年齢確認を通過済みの状態から探索を開始させる。
 * このファイル自体はアサーションを持たない（agents の開始状態の定義のみ）。
 */
test.describe("Agents seed", () => {
	test("seed", async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("age-verified", "true");
			localStorage.setItem("age-verification-date", new Date().toISOString());
			localStorage.setItem("age-verification-adult", "true");
		});
		await page.goto("/");
	});
});
