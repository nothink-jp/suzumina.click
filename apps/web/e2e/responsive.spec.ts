import { expect, test } from "@playwright/test";

const viewports = [
	{ name: "Mobile", width: 375, height: 667 },
	{ name: "Desktop", width: 1440, height: 900 },
];

test.describe("Responsive Design Validation", () => {
	viewports.forEach(({ name, width, height }) => {
		test.describe(`${name} Viewport (${width}x${height})`, () => {
			test.beforeEach(async ({ page }) => {
				await page.setViewportSize({ width, height });
			});

			test("AudioButtonCreator layout", async ({ page }) => {
				await page.goto("/buttons/create?video_id=test-video-id");

				const gridContainer = page.locator(".grid").first();
				await expect(gridContainer).toBeVisible();

				// Check touch targets on mobile
				if (width <= 768) {
					const titleInput = page.getByPlaceholder("例: おはようございます");
					const inputBox = await titleInput.boundingBox();
					if (inputBox) {
						expect(inputBox.height).toBeGreaterThanOrEqual(44);
					}
				}
			});

			test("SimpleAudioButton accessibility", async ({ page }) => {
				await page.goto("/buttons");

				await page.waitForSelector("[data-testid='simple-audio-button']", {
					timeout: 10000,
				});

				const audioButtons = page.locator("[data-testid='simple-audio-button']");
				const count = await audioButtons.count();

				if (count > 0) {
					const firstButton = audioButtons.first();
					await expect(firstButton).toBeVisible();
				}
			});

			test("Navigation adaptation", async ({ page }) => {
				await page.goto("/");

				const siteHeader = page.locator("header");
				await expect(siteHeader).toBeVisible();

				const logo = page.getByText("suzumina.click");
				await expect(logo).toBeVisible();
			});

			test("Form accessibility", async ({ page }) => {
				await page.goto("/contact");

				const submitButton = page.getByRole("button", { name: /送信/ });
				await expect(submitButton).toBeVisible();

				// Check touch target on mobile
				if (width <= 768) {
					const submitBox = await submitButton.boundingBox();
					if (submitBox) {
						expect(submitBox.height).toBeGreaterThanOrEqual(44);
					}
				}
			});

			test("No content overflow", async ({ page }) => {
				await page.goto("/");

				const hasHorizontalScroll = await page.evaluate(() => {
					return document.body.scrollWidth > window.innerWidth;
				});

				expect(hasHorizontalScroll).toBeFalsy();
			});
		});
	});

	test("Touch interaction on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/buttons");

		await page.waitForSelector("[data-testid='simple-audio-button']", {
			timeout: 10000,
		});

		const audioButtons = page.locator("[data-testid='simple-audio-button']");
		const count = await audioButtons.count();

		if (count > 0) {
			const firstButton = audioButtons.first();
			await expect(firstButton).toBeVisible();
		}
	});
});
