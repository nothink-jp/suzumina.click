import { expect, test } from "@playwright/test";

test.describe("検索機能 E2E テスト", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/search");
	});

	test("検索ページが正常に表示される", async ({ page }) => {
		await expect(page.getByText("検索結果")).toBeVisible();
		await expect(page.getByPlaceholder("ボタンや作品を検索...")).toBeVisible();
		await expect(page.getByText("人気タグ")).toBeVisible();
	});

	test("検索フォームの基本機能", async ({ page }) => {
		const searchInput = page.getByTestId("search-input");
		const searchButton = page.getByTestId("search-button");

		await searchInput.fill("テスト検索");
		await searchButton.click();

		await expect(page).toHaveURL("/search?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2");
	});

	test("Enterキーで検索実行", async ({ page }) => {
		const searchInput = page.getByTestId("search-input");

		await searchInput.fill("エンターキーテスト");
		await searchInput.press("Enter");

		await expect(page).toHaveURL(
			"/search?q=%E3%82%A8%E3%83%B3%E3%82%BF%E3%83%BC%E3%82%AD%E3%83%BC%E3%83%86%E3%82%B9%E3%83%88",
		);
	});

	test("人気タグクリックで検索", async ({ page }) => {
		await page.getByText("挨拶").click();
		await expect(page).toHaveURL("/search?q=%E6%8C%A8%E6%8B%B6");
	});

	test("空の検索の場合", async ({ page }) => {
		const searchButton = page.getByTestId("search-button");
		await searchButton.click();
		await expect(page).toHaveURL("/search");
	});

	test("検索結果が存在しない場合", async ({ page }) => {
		const searchInput = page.getByTestId("search-input");
		await searchInput.fill("存在しないキーワード12345");
		await searchInput.press("Enter");

		await expect(page.getByText("に一致する結果が見つかりませんでした")).toBeVisible();
	});
});
