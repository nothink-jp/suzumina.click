import { expect, test } from "@playwright/test";

/**
 * 本番ビルド限定の回帰を捕捉するためのスモーク。
 * SPR-124（radix NavigationMenu が本番ビルドで先頭ナビ項目を脱落させた不具合）は
 * `next dev` では再現せず `next build && next start` でのみ顕在化したため、
 * このスモークは本番ビルドに対して実行する（PLAYWRIGHT_PROD / CI 経由、SPR-125）。
 */
test.describe("@smoke グローバルヘッダー", () => {
	test("デスクトップヘッダーに 3 つのナビリンクが揃っている", async ({ page }) => {
		// デスクトップ幅（md 以上）で nav を表示させる
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");

		await expect(page.getByRole("banner")).toBeVisible();

		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
		await expect(nav).toBeVisible();

		// SPR-124 の回帰（先頭 動画一覧 の脱落）を確実に検出する
		await expect(nav.getByRole("link", { name: "動画一覧" })).toBeVisible();
		await expect(nav.getByRole("link", { name: "ボタン検索" })).toBeVisible();
		await expect(nav.getByRole("link", { name: "作品一覧" })).toBeVisible();
		await expect(nav.getByRole("link")).toHaveCount(3);

		// href も検証（順序・リンク先の固定）
		await expect(nav.getByRole("link", { name: "動画一覧" })).toHaveAttribute("href", "/videos");
	});
});
