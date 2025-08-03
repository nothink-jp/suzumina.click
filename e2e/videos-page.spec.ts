import { expect, test } from "@playwright/test";

test.describe("動画一覧ページ", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/videos");
	});

	test("初期表示が正しく行われる", async ({ page }) => {
		// ページタイトルの確認
		await expect(page.locator("h1")).toContainText("動画一覧");

		// 動画カードが表示されることを確認
		const videoCards = page.locator('[data-testid="video-card"]');
		await expect(videoCards).toHaveCount(12); // デフォルトの12件

		// 件数表示の確認（実際の総数は環境により異なる）
		const countText = page.locator("text=/全\\d+件/");
		await expect(countText).toBeVisible();

		// ページネーションの確認
		const pagination = page.locator('[role="navigation"][aria-label="pagination"]');
		await expect(pagination).toBeVisible();
	});

	test("フィルタリング機能が正しく動作する", async ({ page }) => {
		// 年代フィルタのテスト
		const yearFilter = page.locator('button:has-text("年代を選択")');
		await yearFilter.click();

		// 2024年を選択
		await page.locator('[role="option"]:has-text("2024年")').click();

		// URLパラメータの確認
		await expect(page).toHaveURL(/year=2024/);

		// フィルタが適用されていることを確認
		const activeFilter = page.locator('button:has-text("2024年")');
		await expect(activeFilter).toBeVisible();
	});

	test("検索機能が正しく動作する", async ({ page }) => {
		// 検索フィールドに入力
		const searchInput = page.locator('input[placeholder="動画タイトルで検索..."]');
		await searchInput.fill("歌枠");

		// デバウンス待機（300ms）
		await page.waitForTimeout(400);

		// URLパラメータの確認
		await expect(page).toHaveURL(/search=%E6%AD%8C%E6%9E%A0/);

		// 検索結果が反映されることを確認（結果がある場合）
		const noResults = page.locator("text=該当する動画が見つかりませんでした");
		const hasResults = await noResults.isVisible();

		if (!hasResults) {
			const videoCards = page.locator('[data-testid="video-card"]');
			const count = await videoCards.count();
			expect(count).toBeGreaterThan(0);
		}
	});

	test("ページネーションが正しく動作する", async ({ page }) => {
		// 次のページへ移動
		const nextButton = page.locator('a[aria-label="次のページへ"]');

		// 次ページボタンが存在する場合のみテスト
		if (await nextButton.isVisible()) {
			await nextButton.click();

			// URLパラメータの確認
			await expect(page).toHaveURL(/page=2/);

			// ページ2の動画が表示されることを確認
			const videoCards = page.locator('[data-testid="video-card"]');
			await expect(videoCards).toHaveCount(12);
		}
	});

	test("ページサイズ変更が正しく動作する", async ({ page }) => {
		// ページサイズセレクタをクリック
		const pageSizeSelector = page.locator('button:has-text("12件")');
		await pageSizeSelector.click();

		// 24件を選択
		await page.locator('[role="option"]:has-text("24件")').click();

		// URLパラメータの確認
		await expect(page).toHaveURL(/itemsPerPage=24/);

		// 24件の動画が表示されることを確認（データが十分にある場合）
		await page.waitForLoadState("networkidle");
		const videoCards = page.locator('[data-testid="video-card"]');
		const count = await videoCards.count();
		expect(count).toBeLessThanOrEqual(24);
	});

	test("複数のフィルタを組み合わせて使用できる", async ({ page }) => {
		// 年代フィルタ
		await page.locator('button:has-text("年代を選択")').click();
		await page.locator('[role="option"]:has-text("2024年")').click();

		// カテゴリフィルタ
		await page.locator('button:has-text("カテゴリを選択")').click();
		await page.locator('[role="option"]:has-text("ゲーム")').click();

		// URLパラメータの確認
		await expect(page).toHaveURL(/year=2024/);
		await expect(page).toHaveURL(/categoryNames=%E3%82%B2%E3%83%BC%E3%83%A0/);

		// 両方のフィルタが適用されていることを確認
		await expect(page.locator('button:has-text("2024年")')).toBeVisible();
		await expect(page.locator('button:has-text("ゲーム")')).toBeVisible();
	});

	test("フィルタリセットが正しく動作する", async ({ page }) => {
		// フィルタを適用
		await page.locator('button:has-text("年代を選択")').click();
		await page.locator('[role="option"]:has-text("2024年")').click();

		// リセットボタンをクリック
		const resetButton = page.locator('button:has-text("リセット")');
		await resetButton.click();

		// URLパラメータがクリアされることを確認
		await expect(page).toHaveURL("/videos");

		// フィルタがリセットされていることを確認
		await expect(page.locator('button:has-text("年代を選択")')).toBeVisible();
	});

	test("日本語入力での検索が正しく動作する", async ({ page }) => {
		const searchInput = page.locator('input[placeholder="動画タイトルで検索..."]');

		// 日本語入力のシミュレーション
		await searchInput.click();
		await page.keyboard.type("雑談");

		// デバウンス待機
		await page.waitForTimeout(400);

		// 検索が実行されることを確認
		await expect(page).toHaveURL(/search=%E9%9B%91%E8%AB%87/);
	});

	test("動画カードのリンクが正しく機能する", async ({ page }) => {
		// 最初の動画カードをクリック
		const firstVideoCard = page.locator('[data-testid="video-card"]').first();
		await firstVideoCard.click();

		// 動画詳細ページに遷移することを確認
		await expect(page).toHaveURL(/\/videos\/[a-zA-Z0-9_-]+/);
	});

	test("レスポンシブレイアウトが正しく動作する", async ({ page }) => {
		// モバイルビューポート
		await page.setViewportSize({ width: 375, height: 667 });
		const mobileCards = page.locator('[data-testid="video-card"]');
		await expect(mobileCards).toHaveCount(12);

		// タブレットビューポート
		await page.setViewportSize({ width: 768, height: 1024 });
		const tabletCards = page.locator('[data-testid="video-card"]');
		await expect(tabletCards).toHaveCount(12);

		// デスクトップビューポート
		await page.setViewportSize({ width: 1920, height: 1080 });
		const desktopCards = page.locator('[data-testid="video-card"]');
		await expect(desktopCards).toHaveCount(12);
	});
});

test.describe("動画一覧ページ - エラーハンドリング", () => {
	test("ネットワークエラー時の表示", async ({ page }) => {
		// ネットワークリクエストをインターセプト
		await page.route("**/api/videos**", (route) => {
			route.abort("failed");
		});

		await page.goto("/videos");

		// エラーメッセージが表示されることを確認
		const errorMessage = page.locator("text=データの取得中にエラーが発生しました");
		await expect(errorMessage).toBeVisible();

		// リトライボタンが表示されることを確認
		const retryButton = page.locator('button:has-text("再試行")');
		await expect(retryButton).toBeVisible();
	});

	test("空の検索結果の表示", async ({ page }) => {
		await page.goto("/videos");

		// 存在しないキーワードで検索
		const searchInput = page.locator('input[placeholder="動画タイトルで検索..."]');
		await searchInput.fill("存在しない動画タイトルxxxxxx");

		await page.waitForTimeout(400);

		// 「見つかりませんでした」メッセージが表示されることを確認
		const noResults = page.locator("text=該当する動画が見つかりませんでした");
		await expect(noResults).toBeVisible();
	});
});

test.describe("動画一覧ページ - パフォーマンス", () => {
	test("初期ロード時間の測定", async ({ page }) => {
		const startTime = Date.now();

		await page.goto("/videos");
		await page.waitForLoadState("networkidle");

		const endTime = Date.now();
		const loadTime = endTime - startTime;

		// 3秒以内にロードが完了することを確認
		expect(loadTime).toBeLessThan(3000);

		// 動画カードが表示されることを確認
		const videoCards = page.locator('[data-testid="video-card"]');
		await expect(videoCards).toHaveCount(12);
	});

	test("フィルタ適用時のレスポンス時間", async ({ page }) => {
		await page.goto("/videos");

		const startTime = Date.now();

		// フィルタを適用
		await page.locator('button:has-text("年代を選択")').click();
		await page.locator('[role="option"]:has-text("2024年")').click();

		// 結果が表示されるまで待機
		await page.waitForLoadState("networkidle");

		const endTime = Date.now();
		const responseTime = endTime - startTime;

		// 2秒以内にフィルタが適用されることを確認
		expect(responseTime).toBeLessThan(2000);
	});
});
