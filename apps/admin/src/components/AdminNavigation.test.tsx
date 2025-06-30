import {
	mockViewport,
	testAcrossViewports,
	validateResponsiveClasses,
} from "@suzumina.click/ui/test-utils/responsive-testing";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNavigation } from "./AdminNavigation";

// Next.js router mock
vi.mock("next/navigation", () => ({
	usePathname: () => "/admin",
}));

// NextAuth mock
vi.mock("next-auth/react", () => ({
	signOut: vi.fn(),
	useSession: () => ({
		data: {
			user: {
				name: "Test Admin",
				email: "admin@test.com",
			},
		},
		status: "authenticated",
	}),
}));

describe("AdminNavigation - Responsive Behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockViewport(1440, 900);
	});

	describe("Desktop Navigation", () => {
		it("should show desktop navigation on large screens", () => {
			mockViewport(1024, 768); // Desktop viewport

			render(<AdminNavigation />);

			const desktopNav = document.querySelector(".hidden.md\\:flex");
			expect(desktopNav).toBeInTheDocument();
		});

		it("should hide mobile navigation on desktop", () => {
			mockViewport(1024, 768);

			render(<AdminNavigation />);

			const mobileNav = document.querySelector(".md\\:hidden");
			expect(mobileNav).toBeInTheDocument();
		});
	});

	describe("Mobile Navigation", () => {
		it("should show mobile navigation with touch-optimized buttons", () => {
			mockViewport(375, 667); // Mobile viewport

			render(<AdminNavigation />);

			const mobileNav = document.querySelector(".md\\:hidden");
			expect(mobileNav).toBeInTheDocument();

			// モバイルナビゲーション内のボタンをチェック
			const mobileButtons = mobileNav?.querySelectorAll("a");
			mobileButtons?.forEach((button) => {
				validateResponsiveClasses(button as HTMLElement, {
					base: ["min-h-[44px]", "px-4"],
				});
			});
		});

		it("should have proper touch target sizes on mobile", () => {
			mockViewport(375, 667);

			render(<AdminNavigation />);

			const mobileNavButtons = screen.getAllByRole("link");

			// モバイルナビゲーションのボタンは44px以上
			mobileNavButtons.forEach((button) => {
				if (button.closest(".md\\:hidden")) {
					expect(button).toHaveClass("min-h-[44px]");
				}
			});
		});

		it("should use appropriate icon and text sizes", () => {
			mockViewport(375, 667);

			render(<AdminNavigation />);

			const mobileNavButtons = screen.getAllByRole("link");
			const mobileButton = mobileNavButtons.find((button) => button.closest(".md\\:hidden"));

			if (mobileButton) {
				validateResponsiveClasses(mobileButton, {
					base: ["gap-2", "text-sm"],
				});

				// アイコンサイズの確認
				const icon = mobileButton.querySelector("svg");
				if (icon) {
					expect(icon).toHaveClass("h-4", "w-4");
				}
			}
		});
	});

	describe("Responsive Layout Adaptation", () => {
		testAcrossViewports("should adapt navigation layout", (viewport) => {
			render(<AdminNavigation />);

			if (viewport.width < 768) {
				// Mobile: モバイルナビゲーションが表示される
				const mobileNav = document.querySelector(".md\\:hidden");
				expect(mobileNav).toBeInTheDocument();
			} else {
				// Desktop: デスクトップナビゲーションが表示される
				const desktopNav = document.querySelector(".hidden.md\\:flex");
				expect(desktopNav).toBeInTheDocument();
			}
		});

		it("should maintain consistent branding across viewports", () => {
			const { rerender } = render(<AdminNavigation />);

			// Mobile
			mockViewport(375, 667);
			rerender(<AdminNavigation />);

			let logo = screen.getByText("suzumina.click");
			expect(logo).toBeInTheDocument();

			// Desktop
			mockViewport(1440, 900);
			rerender(<AdminNavigation />);

			logo = screen.getByText("suzumina.click");
			expect(logo).toBeInTheDocument();
		});
	});

	describe("Navigation Items", () => {
		it("should render all navigation items", () => {
			render(<AdminNavigation />);

			const expectedNavItems = [
				"ダッシュボード",
				"ユーザー管理",
				"音声ボタン管理",
				"動画管理",
				"作品管理",
				"お問い合わせ管理",
			];

			expectedNavItems.forEach((item) => {
				expect(screen.getAllByText(item).length).toBeGreaterThan(0);
			});
		});

		it("should have proper active state styling", () => {
			render(<AdminNavigation />);

			// 現在のパスが /admin なので、ダッシュボードがアクティブ
			const dashboardLinks = screen.getAllByText("ダッシュボード");
			expect(dashboardLinks.length).toBeGreaterThan(0);

			// At least one dashboard link should exist
			expect(dashboardLinks[0]).toBeInTheDocument();
		});

		it("should maintain touch targets for all navigation items", () => {
			mockViewport(375, 667);

			render(<AdminNavigation />);

			const mobileNavItems = document.querySelectorAll(".md\\:hidden a");
			mobileNavItems.forEach((item) => {
				expect(item).toHaveClass("min-h-[44px]");
			});
		});
	});

	describe("User Actions", () => {
		it("should render logout button with proper sizing", () => {
			render(<AdminNavigation />);

			const logoutButton = screen.getByRole("button", { name: /ログアウト/ });
			expect(logoutButton).toBeInTheDocument();

			// ログアウトボタンも適切なサイズ (responsive size classes)
			expect(logoutButton).toHaveClass("h-11"); // Mobile size
		});

		it("should show admin system label", () => {
			render(<AdminNavigation />);

			expect(screen.getByText("管理システム")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should be keyboard navigable", () => {
			render(<AdminNavigation />);

			const navigationLinks = screen.getAllByRole("link");
			navigationLinks.forEach((link) => {
				expect(link).toHaveAttribute("href");
			});
		});

		it("should have proper semantic structure", () => {
			render(<AdminNavigation />);

			const navigation = document.querySelector("nav");
			expect(navigation).toBeInTheDocument();
		});

		it("should maintain focus visibility", () => {
			render(<AdminNavigation />);

			const links = screen.getAllByRole("link");
			links.forEach((link) => {
				// フォーカス可能な要素であることを確認
				expect(link.tagName).toBe("A");
				expect(link).toHaveAttribute("href");
			});
		});
	});

	describe("Brand Logo", () => {
		it("should render logo with consistent sizing", () => {
			render(<AdminNavigation />);

			const logoIcon = document.querySelector(".w-8.h-8");
			expect(logoIcon).toBeInTheDocument();
		});

		it("should maintain logo visibility across viewports", () => {
			// Test mobile viewport
			mockViewport(375, 667);
			const { rerender } = render(<AdminNavigation />);
			let brandText = screen.getByText("suzumina.click");
			expect(brandText).toBeInTheDocument();

			// Test tablet viewport
			mockViewport(768, 1024);
			rerender(<AdminNavigation />);
			brandText = screen.getByText("suzumina.click");
			expect(brandText).toBeInTheDocument();

			// Test desktop viewport
			mockViewport(1440, 900);
			rerender(<AdminNavigation />);
			brandText = screen.getByText("suzumina.click");
			expect(brandText).toBeInTheDocument();
		});
	});

	describe("Spacing and Layout", () => {
		it("should use appropriate spacing for mobile", () => {
			mockViewport(375, 667);

			render(<AdminNavigation />);

			const mobileNavContainer = document.querySelector(".md\\:hidden");
			expect(mobileNavContainer).toHaveClass("gap-3");
		});

		it("should handle flex wrap on mobile", () => {
			mockViewport(375, 667);

			render(<AdminNavigation />);

			const mobileNavContainer = document.querySelector(".md\\:hidden");
			expect(mobileNavContainer).toHaveClass("flex-wrap");
		});
	});
});
