import type { Page } from "@playwright/test";

/**
 * 年齢確認を通過済みの状態を再現する（localStorage キーの正本）。
 * data-smoke.spec.ts（スモークの前提）と seed.spec.ts（Playwright Agents の開始状態）の
 * 両方がこれを使う。キー名・値は apps/web/src/contexts/age-verification-context.tsx と対応。
 */
export async function markAgeVerified(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", new Date().toISOString());
		localStorage.setItem("age-verification-adult", "true");
	});
}
