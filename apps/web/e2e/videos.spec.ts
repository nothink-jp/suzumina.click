import { expect, test } from "@playwright/test";

test.describe("動画ページ", () => {
  test("動画一覧ページが正しく表示される", async ({ page }) => {
    await page.goto("/videos");

    // ページタイトルを確認
    await expect(page.getByRole("heading", { name: /動画一覧/ })).toBeVisible();

    // 動画リストが表示される
    const videoList = page.getByRole("list").first();
    await expect(videoList).toBeVisible();

    // 動画カードが表示される
    const videoCards = page.getByRole("article");
    await expect(videoCards.first()).toBeVisible();
  });

  test("動画カードの要素が正しく表示される", async ({ page }) => {
    await page.goto("/videos");

    // 最初の動画カードを取得
    const firstVideoCard = page.getByRole("article").first();
    await expect(firstVideoCard).toBeVisible();

    // 動画タイトルが表示される
    const videoTitle = firstVideoCard.getByRole("heading");
    await expect(videoTitle).toBeVisible();

    // サムネイル画像が表示される
    const thumbnail = firstVideoCard.getByRole("img");
    await expect(thumbnail).toBeVisible();

    // アクションボタンが表示される
    const detailButton = firstVideoCard.getByRole("link", { name: /詳細/ });
    const createButton = firstVideoCard.getByRole("link", {
      name: /ボタン作成/,
    });

    await expect(detailButton).toBeVisible();
    await expect(createButton).toBeVisible();
  });

  test("ページネーションが動作する", async ({ page }) => {
    await page.goto("/videos");

    // ページネーションが表示される
    const pagination = page.getByRole("navigation", {
      name: "ページネーション",
    });
    await expect(pagination).toBeVisible();

    // 次のページボタンがある場合はクリックしてテスト
    const nextButton = page.getByRole("button", { name: "次のページ" });
    if (await nextButton.isEnabled()) {
      await nextButton.click();

      // URLにpage=2が含まれることを確認
      await expect(page).toHaveURL(/page=2/);

      // ページ情報が更新される
      await expect(page.getByText(/2 \/ \d+ページ/)).toBeVisible();
    }
  });

  test("動画詳細ページへの遷移", async ({ page }) => {
    await page.goto("/videos");

    // 最初の動画カードの詳細ボタンをクリック
    const firstDetailButton = page
      .getByRole("article")
      .first()
      .getByRole("link", { name: /詳細/ });
    await firstDetailButton.click();

    // 動画詳細ページに遷移することを確認
    await expect(page).toHaveURL(/\/videos\/[^/]+$/);

    // 詳細ページのコンテンツが表示される
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("音声ボタン作成ページへの遷移", async ({ page }) => {
    await page.goto("/videos");

    // 最初の動画カードのボタン作成リンクをクリック
    const firstCreateButton = page
      .getByRole("article")
      .first()
      .getByRole("link", { name: /ボタン作成/ });
    await firstCreateButton.click();

    // 音声ボタン作成ページに遷移することを確認
    await expect(page).toHaveURL(/\/buttons\/create/);

    // 作成ページのフォームが表示される
    await expect(page.getByText(/音声ファイルのアップロード/)).toBeVisible();
  });

  test("レスポンシブ: モバイルでの表示", async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/videos");

    // 動画カードがモバイルで適切に表示される
    const videoCards = page.getByRole("article");
    await expect(videoCards.first()).toBeVisible();

    // ボタンが縦並びに表示される（モバイルレイアウト）
    const firstCard = videoCards.first();
    const buttons = firstCard.getByRole("link");
    await expect(buttons.first()).toBeVisible();
  });

  test("アクセシビリティ: スクリーンリーダー対応", async ({ page }) => {
    await page.goto("/videos");

    // 動画カードがarticle roleを持つ
    const videoCard = page.getByRole("article").first();
    await expect(videoCard).toBeVisible();

    // 動画タイトルが適切にラベル付けされている
    const videoTitle = videoCard.getByRole("heading");
    await expect(videoTitle).toHaveAttribute("id");

    // ボタンがaria-describedbyを持つ
    const detailButton = videoCard.getByRole("link", { name: /詳細/ });
    await expect(detailButton).toHaveAttribute("aria-describedby");
  });

  test("エラー状態: データが空の場合", async ({ page }) => {
    // モックまたはエラー状態をテストするため、
    // 実際の実装では適切なエラーページやメッセージを確認
    await page.goto("/videos?page=999"); // 存在しないページ

    // エラーメッセージまたは空状態メッセージが表示される
    await expect(
      page.getByText(/動画が見つかりませんでした|データがありません/).first(),
    ).toBeVisible();
  });
});
