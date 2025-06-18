import { expect, test } from "@playwright/test";

test.describe("ホームページ", () => {
  test("ホームページが正しく表示される", async ({ page }) => {
    await page.goto("/");

    // ページタイトルを確認
    await expect(page).toHaveTitle(/すずみなくりっく！/);

    // ヘッダーが表示されることを確認
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText("すずみなくりっく！")).toBeVisible();

    // ナビゲーションリンクを確認
    await expect(page.getByRole("link", { name: "動画一覧" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ボタン検索" })).toBeVisible();
    await expect(page.getByRole("link", { name: "作品一覧" })).toBeVisible();
  });

  test("検索フォームが動作する", async ({ page }) => {
    await page.goto("/");

    // 検索フォームを見つける
    const searchForm = page.getByRole("search");
    await expect(searchForm).toBeVisible();

    // 検索語を入力
    const searchInput = page.getByPlaceholder(/検索/);
    await searchInput.fill("テスト検索");

    // 検索ボタンをクリック
    const searchButton = page.getByRole("button", { name: /検索/ });
    await searchButton.click();

    // 検索結果ページに遷移することを確認
    await expect(page).toHaveURL(/search/);
  });

  test("レスポンシブデザインが機能する", async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");

    // デスクトップナビゲーションが表示される
    await expect(
      page.getByRole("navigation", { name: "メインナビゲーション" }),
    ).toBeVisible();

    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // モバイルメニューボタンが表示される
    await expect(
      page.getByRole("button", { name: "メニューを開く" }),
    ).toBeVisible();

    // モバイルメニューを開く
    await page.getByRole("button", { name: "メニューを開く" }).click();

    // モバイルナビゲーションが表示される
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("アクセシビリティ: キーボードナビゲーション", async ({ page }) => {
    await page.goto("/");

    // Tabキーでナビゲーション
    await page.keyboard.press("Tab");

    // スキップリンクがフォーカスされる
    const skipLink = page.getByRole("link", {
      name: "メインコンテンツにスキップ",
    });
    await expect(skipLink).toBeFocused();

    // Enterキーでスキップリンクを実行
    await page.keyboard.press("Enter");

    // メインコンテンツにフォーカスが移動する
    const mainContent = page.getByRole("main");
    await expect(mainContent).toBeFocused();
  });

  test("フッターが表示される", async ({ page }) => {
    await page.goto("/");

    // フッターを確認
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    // コピーライト表示を確認
    await expect(page.getByText(/© 2025/)).toBeVisible();
  });
});
