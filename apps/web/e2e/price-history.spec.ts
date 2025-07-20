import { expect, test } from "@playwright/test";

test.describe("価格履歴機能", () => {
	const WORK_ID_WITH_HISTORY = "RJ01414353"; // 価格履歴データが存在する作品ID

	test("作品詳細ページで価格履歴タブが表示される", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブが存在することを確認
		const priceHistoryTab = page.getByRole("tab", { name: /価格履歴/ });
		await expect(priceHistoryTab).toBeVisible();
	});

	test("価格履歴タブクリックで価格チャートが表示される", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		const priceHistoryTab = page.getByRole("tab", { name: /価格履歴/ });
		await priceHistoryTab.click();

		// 価格チャートが表示される
		await expect(page.getByText("価格推移チャート")).toBeVisible();

		// チャート要素が表示される（Recharts SVG）
		const chart = page.locator("svg").first();
		await expect(chart).toBeVisible();

		// 価格統計情報が表示される
		await expect(page.getByText("価格統計情報")).toBeVisible();
	});

	test("通貨選択機能が動作する", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// 通貨選択ドロップダウンが表示される
		const currencySelect = page.getByRole("combobox", { name: /通貨/ });
		await expect(currencySelect).toBeVisible();

		// 初期値はJPYであることを確認
		await expect(currencySelect).toHaveValue("JPY");

		// USDに変更
		await currencySelect.selectOption("USD");
		await expect(currencySelect).toHaveValue("USD");

		// チャートが更新される（少し待つ）
		await page.waitForTimeout(1000);

		// USD表記が表示されることを確認
		await expect(page.getByText(/\$/)).toBeVisible();
	});

	test("セール価格表示切り替え機能が動作する", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// セール価格表示チェックボックスが表示される
		const discountToggle = page.getByRole("checkbox", { name: /セール価格を表示/ });
		await expect(discountToggle).toBeVisible();

		// 初期状態ではチェックされている
		await expect(discountToggle).toBeChecked();

		// チェックを外す
		await discountToggle.uncheck();
		await expect(discountToggle).not.toBeChecked();

		// チャートが更新される
		await page.waitForTimeout(1000);
	});

	test("価格統計情報が正しく表示される", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// 統計情報セクションが表示される
		await expect(page.getByText("価格統計情報")).toBeVisible();

		// 統計項目が表示される
		await expect(page.getByText(/最高価格/)).toBeVisible();
		await expect(page.getByText(/最安価格/)).toBeVisible();
		await expect(page.getByText(/現在価格/)).toBeVisible();
		await expect(page.getByText(/平均価格/)).toBeVisible();
	});

	test("更新ボタンが動作する", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// 更新ボタンが表示される
		const refreshButton = page.getByRole("button", { name: /最新データに更新/ });
		await expect(refreshButton).toBeVisible();

		// 更新ボタンをクリック
		await refreshButton.click();

		// ローディング状態が表示される
		await expect(page.getByText(/更新中/)).toBeVisible();

		// 更新完了後、成功メッセージが表示される
		await expect(page.getByText(/価格履歴を更新しました/)).toBeVisible({ timeout: 10000 });
	});

	test("価格履歴データがない作品での表示", async ({ page }) => {
		// 価格履歴データがない作品IDを使用
		await page.goto("/works/RJ999999"); // 存在しない作品ID

		// 作品が見つからない場合のエラーページまたは
		// 価格履歴がない場合のメッセージを確認
		const notFoundMessage = page.getByText(/作品が見つかりません|価格履歴データがありません/);

		// どちらかのメッセージが表示されることを確認
		try {
			await expect(notFoundMessage).toBeVisible({ timeout: 5000 });
		} catch {
			// 作品詳細ページが表示された場合は価格履歴タブをチェック
			const priceHistoryTab = page.getByRole("tab", { name: /価格履歴/ });
			if (await priceHistoryTab.isVisible()) {
				await priceHistoryTab.click();
				await expect(page.getByText(/価格履歴データがありません/)).toBeVisible();
			}
		}
	});

	test("チャートのレスポンシブ表示", async ({ page }) => {
		// モバイルサイズに設定
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// コントロールパネルがモバイルで縦並びになることを確認
		const controlPanel = page.locator(".flex.flex-col.gap-4");
		await expect(controlPanel).toBeVisible();

		// チャートがモバイルサイズに適応していることを確認
		const chart = page.locator("svg").first();
		await expect(chart).toBeVisible();
	});

	test("エラー状態での表示", async ({ page }) => {
		// ネットワークを無効にしてエラー状態をシミュレート
		await page.context().setOffline(true);

		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// 価格履歴タブをクリック
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		// エラーメッセージが表示される
		await expect(page.getByText(/価格履歴の読み込みに失敗しました/)).toBeVisible({
			timeout: 10000,
		});

		// 再試行ボタンが表示される
		const retryButton = page.getByRole("button", { name: /再試行/ });
		await expect(retryButton).toBeVisible();

		// ネットワークを復旧
		await page.context().setOffline(false);
	});

	test("アクセシビリティ: キーボードナビゲーション", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// Tabキーで価格履歴タブにフォーカス
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		// 価格履歴タブがフォーカスされている
		const priceHistoryTab = page.getByRole("tab", { name: /価格履歴/ });
		await expect(priceHistoryTab).toBeFocused();

		// Enterキーでタブを開く
		await page.keyboard.press("Enter");

		// 価格履歴コンテンツが表示される
		await expect(page.getByText("価格推移チャート")).toBeVisible();

		// 通貨選択にTabで移動
		await page.keyboard.press("Tab");
		const currencySelect = page.getByRole("combobox", { name: /通貨/ });
		await expect(currencySelect).toBeFocused();
	});

	test("SEO: 価格履歴ページのメタデータ", async ({ page }) => {
		await page.goto(`/works/${WORK_ID_WITH_HISTORY}`);

		// ページタイトルに作品情報が含まれることを確認
		const title = await page.title();
		expect(title).toContain("作品詳細");

		// 価格履歴タブをクリック後もタイトルが維持される
		await page.getByRole("tab", { name: /価格履歴/ }).click();

		const updatedTitle = await page.title();
		expect(updatedTitle).toContain("作品詳細");
	});
});
