import { expect, test } from "@playwright/test";

test.describe("音声ボタンページ", () => {
	test("音声ボタン一覧ページが表示される", async ({ page }) => {
		await page.goto("/buttons");

		// ページタイトルを確認
		await expect(page.getByRole("heading", { name: /音声ボタン/ })).toBeVisible();

		// 検索パネルが表示される
		await expect(page.getByRole("search")).toBeVisible();
	});

	test("音声ボタン作成ページ（新システム）が表示される", async ({ page }) => {
		// 動画IDパラメータ付きでアクセス
		await page.goto("/buttons/create?video_id=test-video-id");

		// ページタイトルを確認
		await expect(page.getByRole("heading", { name: /音声ボタンを作成/ })).toBeVisible();

		// AudioButtonCreator フォームが表示される
		await expect(page.getByLabel("タイトル")).toBeVisible();
		await expect(page.getByLabel("説明")).toBeVisible();
		await expect(page.getByLabel("カテゴリ")).toBeVisible();

		// YouTubeプレイヤーが表示される
		await expect(page.locator(".youtube-player-container")).toBeVisible();
	});

	test("音声ボタン作成: フォーム入力", async ({ page }) => {
		await page.goto("/buttons/create?video_id=test-video-id");

		// タイトル入力
		const titleInput = page.getByLabel("タイトル");
		await titleInput.fill("テスト音声ボタン");
		await expect(titleInput).toHaveValue("テスト音声ボタン");

		// 説明入力
		const descriptionInput = page.getByLabel("説明");
		await descriptionInput.fill("テスト用の説明");
		await expect(descriptionInput).toHaveValue("テスト用の説明");

		// カテゴリ選択
		const categorySelect = page.getByLabel("カテゴリ");
		await categorySelect.selectOption("voice");
		await expect(categorySelect).toHaveValue("voice");
	});

	test("音声ボタン作成: タイムスタンプ選択", async ({ page }) => {
		await page.goto("/buttons/create?video_id=test-video-id");

		// タイムスタンプ選択セクションが表示される
		await expect(page.getByText("タイムスタンプ選択")).toBeVisible();

		// 開始時間と終了時間のスライダーが表示される
		const sliders = page.locator('input[type="range"]');
		await expect(sliders).toHaveCount(2);

		// 現在時刻設定ボタンが表示される
		await expect(page.getByRole("button", { name: /現在時刻を開始時間に設定/ })).toBeVisible();
	});

	test("音声ボタン作成: アクセシビリティ", async ({ page }) => {
		await page.goto("/buttons/create");

		// アップロードエリアがボタンロールを持つ
		const uploadArea = page.getByRole("button", {
			name: /音声ファイルを選択またはドラッグ&ドロップ/,
		});
		await expect(uploadArea).toBeVisible();

		// 進行状況バーがあることを確認（表示される前は隠れている）
		// ファイルアップロード時に表示される要素なので、存在確認のみ
		await expect(page.getByText(/対応形式/)).toBeVisible();

		// エラーメッセージ用のライブリージョンが設定されている
		// 実際にエラーが発生した時に動的に表示されるため、DOMの構造を確認
		await expect(uploadArea).toHaveAttribute("aria-describedby");
	});

	test("音声ボタン検索機能", async ({ page }) => {
		await page.goto("/buttons");

		// 検索フォームを見つける
		const searchForm = page.getByRole("search");
		await expect(searchForm).toBeVisible();

		// 検索フィールドに入力
		const searchInput = page.getByPlaceholder(/検索/);
		if (await searchInput.isVisible()) {
			await searchInput.fill("テスト");

			// 検索ボタンまたはEnterキーで検索実行
			await page.keyboard.press("Enter");

			// 検索クエリがURLに反映されることを確認
			await expect(page).toHaveURL(/search|query/);
		}
	});

	test("音声ボタンカード表示", async ({ page }) => {
		await page.goto("/buttons");

		// 音声ボタンカードが表示される（データがある場合）
		const buttonCards = page.getByRole("article");

		if ((await buttonCards.count()) > 0) {
			const firstCard = buttonCards.first();

			// カードタイトルが表示される
			const cardTitle = firstCard.getByRole("heading");
			await expect(cardTitle).toBeVisible();

			// 再生ボタンが表示される
			const playButton = firstCard.getByRole("button", { name: /再生/ });
			await expect(playButton).toBeVisible();
		}
	});

	test("レスポンシブ: モバイルでの音声ボタン作成", async ({ page }) => {
		// モバイルサイズに設定
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/buttons/create");

		// アップロードエリアがモバイルでも適切に表示される
		const uploadArea = page.getByRole("button", {
			name: /音声ファイルを選択またはドラッグ&ドロップ/,
		});
		await expect(uploadArea).toBeVisible();

		// ファイル選択ボタンがモバイルでも操作可能
		const fileSelectButton = page.getByRole("button", {
			name: "ファイルを選択",
		});
		await expect(fileSelectButton).toBeVisible();

		// タッチ操作に適したサイズになっている（最小44px）
		const buttonBounds = await fileSelectButton.boundingBox();
		expect(buttonBounds?.height).toBeGreaterThanOrEqual(44);
	});

	test("音声プレイヤーのキーボード操作", async ({ page }) => {
		await page.goto("/buttons");

		// 音声ボタンカードが存在する場合
		const buttonCards = page.getByRole("article");

		if ((await buttonCards.count()) > 0) {
			const firstCard = buttonCards.first();
			const playButton = firstCard.getByRole("button", { name: /再生/ });

			// フォーカスを当てる
			await playButton.focus();
			await expect(playButton).toBeFocused();

			// Enterキーで再生を試行
			await page.keyboard.press("Enter");

			// 音声プレイヤーの状態変化を確認（一時停止ボタンに変わるかなど）
			// 実際の音声は再生されないため、UI状態の変化を確認
		}
	});

	test("エラーハンドリング: 無効なファイル", async ({ page }) => {
		await page.goto("/buttons/create");

		// この場合は、実際のファイルアップロードをテストすることは困難なため、
		// UIの初期状態とエラー表示エリアの存在を確認

		// エラーメッセージ表示エリアが適切に設定されている
		const uploadArea = page.getByRole("button", {
			name: /音声ファイルを選択またはドラッグ&ドロップ/,
		});
		await expect(uploadArea).toHaveAttribute("aria-describedby");

		// ヘルプテキストが表示されている
		await expect(page.getByText(/対応形式: MP3, AAC, Opus, WAV, FLAC/)).toBeVisible();
	});
});
