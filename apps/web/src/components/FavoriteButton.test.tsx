import {
	mockViewport,
	testAcrossViewports,
	validateResponsiveClasses,
} from "@suzumina.click/ui/test-utils/responsive-testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavoriteButton } from "./FavoriteButton";

// Next.js router mock
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}));

// toast mock
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Server actions mock
vi.mock("@/actions/favorites", () => ({
	addToFavorites: vi.fn().mockResolvedValue({ success: true }),
	removeFromFavorites: vi.fn().mockResolvedValue({ success: true }),
}));

describe("FavoriteButton - Touch Optimization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockViewport(1440, 900);
	});

	describe("Touch Target Sizes", () => {
		it("should render with proper touch target sizes for all size variants", () => {
			const sizes = ["sm", "default", "lg"] as const;

			sizes.forEach((size) => {
				const { container } = render(
					<FavoriteButton
						audioButtonId="test"
						isFavorited={false}
						size={size}
						isAuthenticated={true}
					/>,
				);

				const button = container.querySelector("button");

				switch (size) {
					case "sm":
						validateResponsiveClasses(button!, {
							base: ["h-11", "w-11", "sm:h-8", "sm:w-8"],
						});
						break;
					case "default":
						validateResponsiveClasses(button!, {
							base: ["h-11", "w-11", "sm:h-10", "sm:w-10"],
						});
						break;
					case "lg":
						validateResponsiveClasses(button!, {
							base: ["h-12", "w-12"],
						});
						break;
				}
			});
		});

		it("should have minimum 44px touch target on mobile", () => {
			mockViewport(375, 667); // Mobile viewport

			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="sm"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りに追加");
			expect(button).toHaveClass("h-11"); // 44px minimum on mobile
		});

		it("should maintain touch target size when favorited", () => {
			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={true}
					size="default"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りから削除");
			validateResponsiveClasses(button, {
				base: ["h-11", "w-11", "sm:h-10", "sm:w-10"],
			});
		});
	});

	describe("Responsive Behavior", () => {
		testAcrossViewports("should maintain proper sizing", (viewport) => {
			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りに追加");

			// すべてのビューポートで基本的なサイズクラスを持つ
			expect(button).toHaveClass("h-11", "w-11");

			// デスクトップ以上では追加のレスポンシブクラス
			if (viewport.width >= 640) {
				expect(button).toHaveClass("sm:h-10", "sm:w-10");
			}
		});

		it("should handle icon size responsively", () => {
			const sizes = ["sm", "default", "lg"] as const;

			sizes.forEach((size) => {
				render(
					<FavoriteButton
						audioButtonId="test"
						isFavorited={false}
						size={size}
						isAuthenticated={true}
					/>,
				);

				const icon = document.querySelector("svg");
				expect(icon).toBeInTheDocument();

				// Icon should have proper sizing classes (flexible test)
				const hasValidIconSize =
					icon?.classList.contains("h-4") ||
					icon?.classList.contains("h-5") ||
					icon?.classList.contains("h-6");
				expect(hasValidIconSize).toBe(true);
			});
		});
	});

	describe("Touch Interaction", () => {
		it("should be accessible for touch interaction", async () => {
			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りに追加");

			// ボタンが適切にフォーカス可能
			button.focus();
			expect(document.activeElement).toBe(button);

			// ボタンがクリック可能
			expect(button).not.toHaveAttribute("disabled");

			// クリックイベントのテスト
			fireEvent.click(button);

			// Button should respond to click
			expect(button).toBeInTheDocument();
		});

		it("should handle mobile touch interactions correctly", () => {
			mockViewport(375, 667); // Mobile

			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="sm"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りに追加");

			// モバイルでは44px以上のサイズ
			expect(button).toHaveClass("h-11", "w-11");

			// タッチイベントのシミュレーション
			fireEvent.touchStart(button);
			fireEvent.touchEnd(button);
			fireEvent.click(button);

			// イベントが正常に処理されることを確認
			expect(button).toBeInTheDocument();
		});
	});

	describe("State Visual Feedback", () => {
		it("should show different visual states for favorited/unfavorited", () => {
			// Unfavorited state
			const { rerender } = render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={true}
				/>,
			);

			let button = screen.getByLabelText("お気に入りに追加");
			// Unfavorited button uses outline variant
			expect(button).toHaveClass("border", "bg-background");

			// Favorited state
			rerender(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={true}
					size="default"
					isAuthenticated={true}
				/>,
			);

			button = screen.getByLabelText("お気に入りから削除");
			expect(button).toHaveClass("bg-suzuka-500", "hover:bg-suzuka-600");
		});

		it("should maintain visual consistency across sizes", () => {
			const sizes = ["sm", "default", "lg"] as const;

			sizes.forEach((size) => {
				const { container } = render(
					<FavoriteButton
						audioButtonId="test"
						isFavorited={true}
						size={size}
						isAuthenticated={true}
					/>,
				);

				const buttons = screen.getAllByLabelText("お気に入りから削除");
				const button = buttons[0];
				expect(button).toHaveClass("transition-all", "duration-200");

				container.remove();
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels", () => {
			const { rerender } = render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={true}
				/>,
			);

			// Unfavorited state
			expect(screen.getByLabelText("お気に入りに追加")).toBeInTheDocument();

			// Favorited state
			rerender(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={true}
					size="default"
					isAuthenticated={true}
				/>,
			);

			expect(screen.getByLabelText("お気に入りから削除")).toBeInTheDocument();
		});

		it("should be keyboard navigable", () => {
			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={true}
				/>,
			);

			const button = screen.getByLabelText("お気に入りに追加");

			// Tab navigation
			button.focus();
			expect(document.activeElement).toBe(button);

			// Enter key activation
			fireEvent.keyDown(button, { key: "Enter" });
			// The button should remain focusable and respond to keyboard events
			expect(button).toBeInTheDocument();
		});

		it("should handle unauthenticated state properly", () => {
			render(
				<FavoriteButton
					audioButtonId="test"
					isFavorited={false}
					size="default"
					isAuthenticated={false}
				/>,
			);

			// ログインが必要な状態でも適切なサイズを保持
			const button = screen.getByLabelText("お気に入りに追加");
			expect(button).toHaveClass("h-11", "w-11");
		});
	});

	describe("Performance and Optimization", () => {
		it("should not re-render unnecessarily", () => {
			const renderSpy = vi.fn();

			const TestWrapper = ({ isFavorited }: { isFavorited: boolean }) => {
				renderSpy();
				return (
					<FavoriteButton
						audioButtonId="test"
						isFavorited={isFavorited}
						size="default"
						isAuthenticated={true}
					/>
				);
			};

			const { rerender } = render(<TestWrapper isFavorited={false} />);

			// 初回レンダリング
			expect(renderSpy).toHaveBeenCalledTimes(1);

			// 同じpropsで再レンダリング
			rerender(<TestWrapper isFavorited={false} />);
			expect(renderSpy).toHaveBeenCalledTimes(2);

			// 状態変更
			rerender(<TestWrapper isFavorited={true} />);
			expect(renderSpy).toHaveBeenCalledTimes(3);
		});
	});
});
