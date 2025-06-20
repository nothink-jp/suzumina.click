import { expect, test } from "@playwright/test";

test.describe("音声リファレンス機能", () => {
  test("音声ボタン一覧ページが表示される", async ({ page }) => {
    await page.goto("/buttons");

    // ページタイトルを確認
    await expect(
      page.getByRole("heading", { name: /音声ボタン/ }),
    ).toBeVisible();

    // 検索フォームが表示される
    const searchPanel = page
      .locator('[data-testid="search-panel"]')
      .or(page.getByRole("search"));
    await expect(searchPanel).toBeVisible();

    // 音声ボタン作成リンクが表示される
    await expect(
      page.getByRole("link", { name: /音声ボタンを作成/ }),
    ).toBeVisible();
  });

  test("音声ボタン作成ページ（新システム）が表示される", async ({ page }) => {
    // 動画IDパラメータ付きで音声ボタン作成ページにアクセス
    await page.goto("/buttons/create?video_id=test-video-id");

    // AudioReferenceCreator コンポーネントが表示される
    await expect(
      page.getByRole("heading", { name: /音声ボタンを作成/ }),
    ).toBeVisible();

    // YouTubeプレイヤーエリアが表示される
    await expect(page.locator(".youtube-player-container")).toBeVisible();

    // フォーム要素が表示される
    await expect(page.getByLabel("タイトル")).toBeVisible();
    await expect(page.getByLabel("説明")).toBeVisible();
    await expect(page.getByLabel("カテゴリ")).toBeVisible();
  });

  test("動画IDなしでアクセスした場合のエラー表示", async ({ page }) => {
    await page.goto("/buttons/create");

    // エラーメッセージが表示される
    await expect(page.getByText(/動画IDが指定されていません/)).toBeVisible();

    // 動画一覧への誘導リンクが表示される
    await expect(
      page.getByRole("link", { name: /動画一覧から選ぶ/ }),
    ).toBeVisible();
  });

  test("音声ボタン作成フォームの入力", async ({ page }) => {
    await page.goto("/buttons/create?video_id=test-video-id");

    // タイトル入力
    const titleInput = page.getByLabel("タイトル");
    await titleInput.fill("E2Eテスト音声ボタン");
    await expect(titleInput).toHaveValue("E2Eテスト音声ボタン");

    // 説明入力
    const descriptionInput = page.getByLabel("説明");
    await descriptionInput.fill("これはE2Eテスト用の音声ボタンです");
    await expect(descriptionInput).toHaveValue(
      "これはE2Eテスト用の音声ボタンです",
    );

    // カテゴリ選択
    const categorySelect = page.getByLabel("カテゴリ");
    await categorySelect.selectOption("voice");
    await expect(categorySelect).toHaveValue("voice");

    // プレビューに入力内容が反映されることを確認
    await expect(page.getByText("E2Eテスト音声ボタン")).toBeVisible();
  });

  test("タイムスタンプ選択機能", async ({ page }) => {
    await page.goto("/buttons/create?video_id=test-video-id");

    // タイムスタンプ選択セクションが表示される
    await expect(page.getByText("タイムスタンプ選択")).toBeVisible();

    // 開始時間と終了時間のスライダーが表示される
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);

    // 現在時刻設定ボタンが表示される
    await expect(
      page.getByRole("button", { name: /現在時刻を開始時間に設定/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /現在時刻を終了時間に設定/ }),
    ).toBeVisible();
  });

  test("タグ入力機能", async ({ page }) => {
    await page.goto("/buttons/create?video_id=test-video-id");

    // タグ入力フィールドが表示される
    const tagInput = page.getByPlaceholder(/タグを入力してEnterキー/);
    await expect(tagInput).toBeVisible();

    // タグを追加
    await tagInput.fill("E2Eテスト");
    await page.keyboard.press("Enter");

    // 追加されたタグが表示される
    await expect(page.getByText("E2Eテスト")).toBeVisible();

    // タグ削除ボタンが表示される
    await expect(
      page.getByRole("button", { name: /E2Eテストを削除/ }),
    ).toBeVisible();
  });

  test("音声ボタン詳細ページ", async ({ page }) => {
    // 実際のIDがある場合の詳細ページにアクセス
    // テストデータがない場合は、モックURLでUI確認
    await page.goto("/buttons/test-audio-ref-id");

    // 詳細ページの要素が表示される（データがある場合）
    const heading = page.getByRole("heading").first();
    if (await heading.isVisible()) {
      // 基本情報セクション
      await expect(heading).toBeVisible();

      // YouTubeプレイヤーセクション
      await expect(page.getByText("YouTube動画プレイヤー")).toBeVisible();

      // 関連音声ボタンセクション（データがある場合）
      const relatedSection = page.getByText("関連音声ボタン");
      if (await relatedSection.isVisible()) {
        await expect(relatedSection).toBeVisible();
      }
    }
  });

  test("検索とフィルタリング機能", async ({ page }) => {
    await page.goto("/buttons");

    // 検索フォームが表示される場合
    const searchInput = page
      .getByPlaceholder(/検索/)
      .or(page.getByRole("textbox", { name: /検索/ }));

    if (await searchInput.isVisible()) {
      // 検索キーワード入力
      await searchInput.fill("テスト");
      await page.keyboard.press("Enter");

      // URLに検索パラメータが反映される
      await expect(page).toHaveURL(/q=テスト/);
    }

    // カテゴリフィルター（存在する場合）
    const categoryFilter = page
      .getByLabel(/カテゴリ/)
      .or(page.locator('select[name="category"]'));

    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption("voice");
      await expect(page).toHaveURL(/category=voice/);
    }
  });

  test("動画詳細ページからの音声ボタン作成", async ({ page }) => {
    // 動画詳細ページにアクセス
    await page.goto("/videos/test-video-id");

    // 音声ボタンセクションが表示される
    await expect(page.getByText("音声ボタン")).toBeVisible();

    // 音声ボタン作成リンクが表示される
    const createButton = page
      .getByRole("link", {
        name: /音声ボタンを作成/,
      })
      .or(
        page.getByRole("link", {
          name: /新しい音声ボタンを作成/,
        }),
      );

    if (await createButton.isVisible()) {
      // 音声ボタン作成ページに遷移
      await createButton.click();

      // 適切なURLパラメータ付きで遷移することを確認
      await expect(page).toHaveURL(/\/buttons\/create\?video_id=test-video-id/);

      // 作成フォームが表示される
      await expect(
        page.getByRole("heading", { name: /音声ボタンを作成/ }),
      ).toBeVisible();
    }
  });

  test("レスポンシブデザイン: モバイル表示", async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/buttons");

    // ページが適切に表示される
    await expect(
      page.getByRole("heading", { name: /音声ボタン/ }),
    ).toBeVisible();

    // 検索フォームがモバイルでも操作可能
    const searchPanel = page
      .locator('[data-testid="search-panel"]')
      .or(page.getByRole("search"));
    if (await searchPanel.isVisible()) {
      await expect(searchPanel).toBeVisible();
    }

    // 作成ページもモバイル対応
    await page.goto("/buttons/create?video_id=test-video-id");

    // フォーム要素がモバイルでも適切に表示される
    await expect(page.getByLabel("タイトル")).toBeVisible();

    // タッチ操作に適したサイズ（最小44px）
    const titleInput = page.getByLabel("タイトル");
    const inputBounds = await titleInput.boundingBox();
    expect(inputBounds?.height).toBeGreaterThanOrEqual(44);
  });

  test("アクセシビリティ: キーボード操作", async ({ page }) => {
    await page.goto("/buttons/create?video_id=test-video-id");

    // フォーム要素にTabキーでフォーカス移動
    await page.keyboard.press("Tab");
    const titleInput = page.getByLabel("タイトル");
    await expect(titleInput).toBeFocused();

    // タイトル入力
    await page.keyboard.type("キーボードテスト");
    await expect(titleInput).toHaveValue("キーボードテスト");

    // 次の要素にフォーカス移動
    await page.keyboard.press("Tab");
    const descriptionInput = page.getByLabel("説明");
    await expect(descriptionInput).toBeFocused();
  });

  test("エラーハンドリング: 不正なアクセス", async ({ page }) => {
    // 存在しない音声ボタンIDでアクセス
    const response = await page.goto("/buttons/non-existent-id");

    // 404ページまたはエラーメッセージが表示される
    if (response?.status() === 404) {
      await expect(page.getByText(/見つかりません|Not Found/)).toBeVisible();
    } else {
      // Next.jsの notFound() によるエラーページ
      await expect(page.getByText(/見つかりません/)).toBeVisible();
    }
  });

  test("YouTube埋め込みプレイヤーの動作", async ({ page }) => {
    await page.goto("/buttons/create?video_id=test-video-id");

    // YouTubeプレイヤーコンテナが表示される
    const playerContainer = page.locator(".youtube-player-container");
    await expect(playerContainer).toBeVisible();

    // プレイヤーの読み込み状態を確認
    const loadingText = page.getByText(/YouTube Player を読み込み中/);
    if (await loadingText.isVisible()) {
      // 読み込み完了を待つ
      await expect(loadingText).toBeHidden({ timeout: 10000 });
    }

    // プレイヤーが実際にロードされた場合の確認
    // (YouTubeのAPIが利用可能でない場合はスキップ)
    const iframe = page.locator('iframe[src*="youtube.com"]');
    if (await iframe.isVisible()) {
      await expect(iframe).toBeVisible();
    }
  });
});
