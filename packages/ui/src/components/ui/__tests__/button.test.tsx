import { render } from "@testing-library/react";
import {
	mockViewport,
	testAcrossViewports,
	validateResponsiveClasses,
} from "../../../test-utils/responsive-testing";
import { Button } from "../button";

describe("Button - Responsive Touch Optimization", () => {
	beforeEach(() => {
		// デフォルトのビューポートサイズをリセット
		mockViewport(1440, 900);
	});

	describe("Touch Target Sizes", () => {
		it("should render with mobile-first touch-friendly sizes", () => {
			const { container } = render(<Button>Test Button</Button>);

			const button = container.firstChild as HTMLElement;
			expect(button).toHaveClass("h-11", "sm:h-9"); // Default size
		});

		it("should have proper responsive sizing for all size variants", () => {
			const sizes = ["sm", "default", "lg", "icon"] as const;

			sizes.forEach((size) => {
				const { container } = render(<Button size={size}>Test</Button>);
				const button = container.firstChild as HTMLElement;

				switch (size) {
					case "sm":
						validateResponsiveClasses(button, {
							base: ["h-11", "sm:h-8"],
						});
						break;
					case "default":
						validateResponsiveClasses(button, {
							base: ["h-11", "sm:h-9"],
						});
						break;
					case "lg":
						validateResponsiveClasses(button, {
							base: ["h-11", "sm:h-10"],
						});
						break;
					case "icon":
						validateResponsiveClasses(button, {
							base: ["size-11", "sm:size-9"],
						});
						break;
				}
			});
		});

		it("should maintain minimum 44px height on mobile viewports", () => {
			mockViewport(375, 667); // Mobile viewport

			const { container } = render(<Button size="sm">Small Button</Button>);
			const button = container.firstChild as HTMLElement;

			// h-11 = 44px on mobile
			expect(button).toHaveClass("h-11");
		});
	});

	describe("Responsive Behavior", () => {
		testAcrossViewports("should have appropriate button sizing", (viewport) => {
			const { container } = render(<Button>Responsive Button</Button>);
			const button = container.firstChild as HTMLElement;

			// すべてのビューポートで基本クラスは保持
			expect(button).toHaveClass("h-11");

			// デスクトップサイズではsm:h-9も適用される想定
			if (viewport.width >= 640) {
				expect(button).toHaveClass("sm:h-9");
			}
		});

		it("should handle variant combinations correctly", () => {
			const { container } = render(
				<Button variant="outline" size="lg">
					Outline Large Button
				</Button>,
			);

			const button = container.firstChild as HTMLElement;

			validateResponsiveClasses(button, {
				base: ["h-11", "sm:h-10"], // Large size
			});

			// Outline variant classes
			expect(button).toHaveClass("border", "bg-background");
		});
	});

	describe("Icon Button Accessibility", () => {
		it("should maintain square aspect ratio across viewports", () => {
			const { container } = render(<Button size="icon">📱</Button>);
			const button = container.firstChild as HTMLElement;

			validateResponsiveClasses(button, {
				base: ["size-11", "sm:size-9"],
			});
		});

		it("should have adequate touch target for icon buttons", () => {
			mockViewport(375, 667); // Mobile

			const { container } = render(<Button size="icon">❤️</Button>);
			const button = container.firstChild as HTMLElement;

			// size-11 = 44x44px on mobile
			expect(button).toHaveClass("size-11");
		});
	});

	describe("Padding and Spacing", () => {
		it("should have responsive padding for text buttons", () => {
			const { container } = render(<Button>Button with Text</Button>);
			const button = container.firstChild as HTMLElement;

			validateResponsiveClasses(button, {
				base: ["px-4", "py-2", "has-[>svg]:px-3"],
			});
		});

		it("should maintain proper spacing with icons", () => {
			const { container } = render(
				<Button>
					<span>📊</span>
					Button with Icon
				</Button>,
			);

			const button = container.firstChild as HTMLElement;
			expect(button).toHaveClass("gap-2"); // Icon spacing
		});
	});

	describe("Focus and Interaction States", () => {
		it("should maintain focus outline visibility on all viewport sizes", () => {
			const { container } = render(<Button>Focusable Button</Button>);
			const button = container.firstChild as HTMLElement;

			validateResponsiveClasses(button, {
				base: [
					"outline-none",
					"focus-visible:border-ring",
					"focus-visible:ring-ring/50",
					"focus-visible:ring-[3px]",
				],
			});
		});

		it("should be accessible for touch interaction", () => {
			const { container } = render(<Button>Touch Button</Button>);
			const button = container.firstChild as HTMLElement;

			// クリック可能性の確認
			expect(button.tagName).toBe("BUTTON");
			expect(button).not.toHaveAttribute("disabled");

			// Touch target size validation would need actual DOM measurement
			expect(button).toHaveClass("h-11"); // Minimum 44px height
		});
	});

	describe("Disabled States", () => {
		it("should maintain proper sizing when disabled", () => {
			const { container } = render(<Button disabled>Disabled Button</Button>);
			const button = container.firstChild as HTMLElement;

			validateResponsiveClasses(button, {
				base: ["h-11", "sm:h-9"],
			});

			expect(button).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50");
		});
	});
});
