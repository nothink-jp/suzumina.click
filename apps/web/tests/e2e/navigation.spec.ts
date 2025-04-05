import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  // localhost:3000 にアクセス
  await page.goto('/');

  // ページのタイトルが "すずみなふぁみりー" であることを確認
  await expect(page).toHaveTitle("すずみなふぁみりー");
});

test('navigate to signin page', async ({ page }) => {
  // localhost:3000 にアクセス
  await page.goto('/');

  // "ログイン" リンクをクリック
  await page.getByRole('link', { name: 'ログイン' }).click();

  // URLが /auth/signin に変わることを確認
  await expect(page).toHaveURL(/.*\/auth\/signin/);

  // "Discordでログイン" ボタンが表示されていることを確認
  await expect(page.getByRole('button', { name: 'Discordでログイン' })).toBeVisible();
});