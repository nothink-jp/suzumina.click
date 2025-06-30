import { expect, test } from "@playwright/test";

const viewports = [
	{ name: "Mobile", width: 375, height: 667 },
	{ name: "Tablet", width: 768, height: 1024 },
	{ name: "Desktop", width: 1440, height: 900 },
];

test.describe("Responsive Design Validation", () => {
	viewports.forEach(({ name, width, height }) => {
		test.describe(`${name} Viewport (${width}x${height})`, () => {
			test.beforeEach(async ({ page }) => {
				await page.setViewportSize({ width, height });
			});

			test("AudioButtonCreator layout adaptation", async ({ page }) => {
				await page.goto("/buttons/create?video_id=test-video-id");

				// Check if page loads without errors
				await expect(page.locator("h1")).toContainText("音声ボタンを作成");

				// Check grid layout exists
				const gridContainer = page.locator(".grid").first();
				await expect(gridContainer).toBeVisible();

				// Verify touch target sizes on mobile/tablet
				if (width <= 768) {
					const buttons = page.getByRole("button").all();
					for (const button of await buttons) {
						const box = await button.boundingBox();
						if (box && box.height > 0) {
							expect(box.height).toBeGreaterThanOrEqual(40); // At least 40px for touch
						}
					}
				}

				// Check input field accessibility
				const titleInput = page.getByPlaceholder("例: おはようございます");
				await expect(titleInput).toBeVisible();

				const inputBox = await titleInput.boundingBox();
				if (inputBox && width <= 768) {
					expect(inputBox.height).toBeGreaterThanOrEqual(44);
				}
			});

			test("SimpleAudioButton touch targets", async ({ page }) => {
				await page.goto("/buttons");

				// Wait for audio buttons to load
				await page.waitForSelector("[data-testid='simple-audio-button']", {
					timeout: 10000,
				});

				const audioButtons = page.locator("[data-testid='simple-audio-button']");
				const count = await audioButtons.count();

				if (count > 0) {
					const firstButton = audioButtons.first();
					await expect(firstButton).toBeVisible();

					// Check play button touch target
					const playButton = firstButton.getByLabelText(/を再生/);
					if ((await playButton.count()) > 0) {
						const playBox = await playButton.boundingBox();
						if (playBox && width <= 768) {
							expect(playBox.height).toBeGreaterThanOrEqual(40);
						}
					}

					// Check info button touch target
					const infoButton = firstButton.getByLabelText("詳細情報を表示");
					if ((await infoButton.count()) > 0) {
						const infoBox = await infoButton.boundingBox();
						if (infoBox && width <= 768) {
							expect(infoBox.height).toBeGreaterThanOrEqual(44);
							expect(infoBox.width).toBeGreaterThanOrEqual(44);
						}
					}
				}
			});

			test("Navigation adaptation", async ({ page }) => {
				await page.goto("/");

				// Check site header
				const siteHeader = page.locator("header");
				await expect(siteHeader).toBeVisible();

				if (width < 768) {
					// Mobile: check for mobile menu button
					const mobileMenuButton = page.getByRole("button", { name: /メニュー/ });
					if ((await mobileMenuButton.count()) > 0) {
						await expect(mobileMenuButton).toBeVisible();

						const menuBox = await mobileMenuButton.boundingBox();
						if (menuBox) {
							expect(menuBox.height).toBeGreaterThanOrEqual(44);
						}
					}
				} else {
					// Desktop: check for navigation links
					const navLinks = page.locator("nav a");
					const linkCount = await navLinks.count();
					expect(linkCount).toBeGreaterThan(0);
				}

				// Check logo visibility
				const logo = page.getByText("suzumina.click");
				await expect(logo).toBeVisible();
			});

			test("Favorite button interactions", async ({ page }) => {
				await page.goto("/buttons");

				// Wait for buttons to load
				await page.waitForSelector("[data-testid='simple-audio-button']", {
					timeout: 10000,
				});

				const favoriteButtons = page.getByLabelText(/お気に入り/);
				const count = await favoriteButtons.count();

				if (count > 0) {
					const firstFavoriteButton = favoriteButtons.first();
					await expect(firstFavoriteButton).toBeVisible();

					const buttonBox = await firstFavoriteButton.boundingBox();
					if (buttonBox && width <= 768) {
						expect(buttonBox.height).toBeGreaterThanOrEqual(44);
						expect(buttonBox.width).toBeGreaterThanOrEqual(44);
					}

					// Test hover/focus states
					await firstFavoriteButton.hover();
					await expect(firstFavoriteButton).toBeVisible();
				}
			});

			test("Form elements accessibility", async ({ page }) => {
				await page.goto("/contact");

				// Check contact form elements
				const nameInput = page.getByLabel("お名前");
				const emailInput = page.getByLabel("メールアドレス");
				const messageInput = page.getByLabel("お問い合わせ内容");
				const submitButton = page.getByRole("button", { name: /送信/ });

				await expect(nameInput).toBeVisible();
				await expect(emailInput).toBeVisible();
				await expect(messageInput).toBeVisible();
				await expect(submitButton).toBeVisible();

				// Check touch target sizes on mobile
				if (width <= 768) {
					const submitBox = await submitButton.boundingBox();
					if (submitBox) {
						expect(submitBox.height).toBeGreaterThanOrEqual(44);
					}

					const nameBox = await nameInput.boundingBox();
					if (nameBox) {
						expect(nameBox.height).toBeGreaterThanOrEqual(44);
					}
				}
			});

			test("Audio button list layout", async ({ page }) => {
				await page.goto("/buttons");

				// Check for flex-wrap layout
				const buttonContainer = page.locator(".flex.flex-wrap").first();
				if ((await buttonContainer.count()) > 0) {
					await expect(buttonContainer).toBeVisible();
				}

				// Verify no horizontal scroll
				const bodyScrollWidth = await page.evaluate(() => {
					return document.body.scrollWidth;
				});
				const windowInnerWidth = await page.evaluate(() => {
					return window.innerWidth;
				});

				// Allow for small scrollbar width
				expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 20);
			});

			test("Admin interface adaptation", async ({ page }) => {
				// Skip admin tests for public E2E (would require authentication)
				test.skip();
			});
		});
	});

	test.describe("Cross-viewport consistency", () => {
		test("Content remains accessible across all viewport sizes", async ({ page }) => {
			for (const viewport of viewports) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});

				await page.goto("/");

				// Check that essential content is always visible
				await expect(page.getByText("suzumina.click")).toBeVisible();

				// Check that main navigation is accessible
				const navElement = page.locator("nav, header");
				await expect(navElement).toBeVisible();

				// Check that main content area exists
				const mainContent = page.locator("main, [role='main']");
				if ((await mainContent.count()) > 0) {
					await expect(mainContent).toBeVisible();
				}
			}
		});

		test("No content overflow across viewports", async ({ page }) => {
			for (const viewport of viewports) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});

				await page.goto("/");

				// Check for horizontal scrollbar
				const hasHorizontalScroll = await page.evaluate(() => {
					return document.body.scrollWidth > window.innerWidth;
				});

				expect(hasHorizontalScroll).toBeFalsy();
			}
		});
	});

	test.describe("Touch interaction validation", () => {
		test("Touch events work correctly on mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/buttons");

			// Wait for buttons to load
			await page.waitForSelector("[data-testid='simple-audio-button']", {
				timeout: 10000,
			});

			const audioButtons = page.locator("[data-testid='simple-audio-button']");
			const count = await audioButtons.count();

			if (count > 0) {
				const firstButton = audioButtons.first();
				const playButton = firstButton.getByLabelText(/を再生/);

				if ((await playButton.count()) > 0) {
					// Simulate touch interaction
					await playButton.dispatchEvent("touchstart");
					await playButton.dispatchEvent("touchend");
					await playButton.click();

					// Verify the interaction worked (button should still be visible)
					await expect(playButton).toBeVisible();
				}
			}
		});

		test("Tap targets are appropriately sized", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");

			// Get all interactive elements
			const interactiveElements = page.locator("button, a, input, [role='button']");
			const count = await interactiveElements.count();

			let tooSmallCount = 0;
			const maxCheckCount = Math.min(count, 20); // Limit to prevent timeout

			for (let i = 0; i < maxCheckCount; i++) {
				const element = interactiveElements.nth(i);
				if (await element.isVisible()) {
					const box = await element.boundingBox();
					if (box && (box.width < 40 || box.height < 40)) {
						tooSmallCount++;
					}
				}
			}

			// Allow some small elements (e.g., close buttons, icons)
			// but most should meet touch target guidelines
			const tooSmallPercentage = tooSmallCount / maxCheckCount;
			expect(tooSmallPercentage).toBeLessThan(0.3); // Less than 30% too small
		});
	});
});
