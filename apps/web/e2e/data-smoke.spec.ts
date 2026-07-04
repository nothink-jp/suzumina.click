import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

/**
 * Firestore Emulator + fixtures 前提のデータ依存スモーク（PLAYWRIGHT_EMULATOR=1 のときのみ実行）。
 * ワンショット実行はリポジトリルートの `pnpm test:e2e:emulator`（Emulator 起動 + seed + 本番ビルド + 実行）。
 *
 * データの正本は apps/functions/src/tools/firestore-local/fixtures/*.json。
 * 本番 Firestore の ID をここへハードコードしないこと（CI に存在保証がなく必ず腐る）。
 * fixtures を実行時に読んで ID・タイトルを取るため、seed:dump で鮮度更新しても spec は追従する。
 */

const FIXTURES_DIR = join(__dirname, "../../functions/src/tools/firestore-local/fixtures");

interface FixtureDoc {
	id: string;
	data: Record<string, unknown>;
}

/** fixture の先頭ドキュメント（id 昇順）を返す。「どのドキュメントか」を決定論化する */
function firstFixtureDoc(name: string): FixtureDoc {
	const raw = readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf-8");
	const { docs } = JSON.parse(raw) as { docs: FixtureDoc[] };
	const doc = [...docs].sort((a, b) => a.id.localeCompare(b.id))[0];
	if (!doc) {
		throw new Error(`fixture ${name} が空です`);
	}
	return doc;
}

/** 年齢確認を通過済みの状態を再現する（ダイアログ経由の通過は「年齢確認ゲート」テストで担保） */
async function markAgeVerified(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", new Date().toISOString());
		localStorage.setItem("age-verification-adult", "true");
	});
}

// biome-ignore lint/suspicious/noSkippedTests: デバッグ用の無効化ではなく実行環境ガード（Emulator 必須）
test.skip(
	!process.env.PLAYWRIGHT_EMULATOR,
	"Emulator + seed 前提（pnpm test:e2e:emulator で実行）",
);

test.describe("@data-smoke 年齢確認ゲート", () => {
	test("初回訪問でダイアログが表示され、18歳以上を選ぶと通過できる", async ({ page }) => {
		await page.goto("/videos");

		const dialog = page.getByRole("dialog", { name: "年齢確認" });
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "18歳以上" }).click();
		await expect(dialog).toBeHidden();

		// 通過後、Emulator の fixtures 由来の動画一覧が描画される
		await expect(page.locator('a[href^="/videos/"]').first()).toBeVisible();
	});
});

test.describe("@data-smoke 一覧→詳細（fixtures 由来）", () => {
	test("/works: R18 作品一覧が並び、先頭の作品詳細へ遷移できる", async ({ page }) => {
		await markAgeVerified(page);
		await page.goto("/works");

		// fixtures の works は全件 R18。年齢確認済みユーザーの初回訪問で一覧に並ぶこと
		const workLink = page.locator('a[href^="/works/RJ"]').first();
		await expect(workLink).toBeVisible();
		await workLink.click();

		await expect(page).toHaveURL(/\/works\/RJ/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});
});

test.describe("@data-smoke 詳細ページ直行（fixtures 由来）", () => {
	test("/works/{id}: fixture の作品タイトルが描画される", async ({ page }) => {
		const work = firstFixtureDoc("works");
		await markAgeVerified(page);
		await page.goto(`/works/${work.id}`);

		await expect(
			page.getByRole("heading", { level: 1, name: String(work.data.title) }),
		).toBeVisible();
	});

	test("/videos/{id}: fixture の動画タイトルが描画される", async ({ page }) => {
		const video = firstFixtureDoc("videos");
		await markAgeVerified(page);
		await page.goto(`/videos/${video.id}`);

		await expect(
			page.getByRole("heading", { level: 1, name: String(video.data.title) }),
		).toBeVisible();
	});

	test("/buttons/{id}: fixture のボタンテキストが描画される", async ({ page }) => {
		const button = firstFixtureDoc("audioButtons");
		await markAgeVerified(page);
		await page.goto(`/buttons/${button.id}`);

		await expect(page.getByText(String(button.data.buttonText)).first()).toBeVisible();
	});
});
