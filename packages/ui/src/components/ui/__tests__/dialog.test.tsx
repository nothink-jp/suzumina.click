import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../dialog";

describe("Dialog - Custom Props", () => {
	describe("showCloseButton prop", () => {
		it("should show close button by default", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			// Close button should be present
			const closeButton = screen.getByRole("button", { name: /close/i });
			expect(closeButton).toBeInTheDocument();
		});

		it("should show close button when showCloseButton is true", () => {
			render(
				<Dialog open>
					<DialogContent showCloseButton={true}>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			// Close button should be present
			const closeButton = screen.getByRole("button", { name: /close/i });
			expect(closeButton).toBeInTheDocument();
		});

		it("should hide close button when showCloseButton is false", () => {
			render(
				<Dialog open>
					<DialogContent showCloseButton={false}>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			// Close button should not be present
			const closeButton = screen.queryByRole("button", { name: /close/i });
			expect(closeButton).not.toBeInTheDocument();
		});
	});

	describe("data-slot attributes", () => {
		it("should apply custom data-slot attributes to all components", () => {
			render(
				<Dialog open>
					<DialogTrigger data-testid="trigger">Open Dialog</DialogTrigger>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			// Check data-slot attributes
			const trigger = screen.getByTestId("trigger");
			const content = screen.getByTestId("content");

			expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
			expect(content).toHaveAttribute("data-slot", "dialog-content");
		});
	});

	describe("responsive design", () => {
		it("should have responsive max-width classes", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Check responsive width classes
			expect(content).toHaveClass("max-w-[calc(100%-2rem)]");
			expect(content).toHaveClass("sm:max-w-lg");
		});

		it("should have proper positioning classes", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Check positioning classes
			expect(content).toHaveClass("fixed");
			expect(content).toHaveClass("top-[50%]");
			expect(content).toHaveClass("left-[50%]");
			expect(content).toHaveClass("translate-x-[-50%]");
			expect(content).toHaveClass("translate-y-[-50%]");
		});
	});

	describe("animation classes", () => {
		it("should have proper animation classes", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Check animation classes
			expect(content).toHaveClass("data-[state=open]:animate-in");
			expect(content).toHaveClass("data-[state=closed]:animate-out");
			expect(content).toHaveClass("data-[state=closed]:fade-out-0");
			expect(content).toHaveClass("data-[state=open]:fade-in-0");
			expect(content).toHaveClass("data-[state=closed]:zoom-out-95");
			expect(content).toHaveClass("data-[state=open]:zoom-in-95");
		});
	});

	describe("close button styling", () => {
		it("should have proper close button styling when visible", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Check positioning
			expect(closeButton).toHaveClass("absolute");
			expect(closeButton).toHaveClass("top-4");
			expect(closeButton).toHaveClass("right-4");

			// Check styling
			expect(closeButton).toHaveClass("opacity-70");
			expect(closeButton).toHaveClass("hover:opacity-100");
			expect(closeButton).toHaveClass("transition-opacity");

			// Check accessibility
			expect(closeButton).toHaveClass("focus:ring-2");
			expect(closeButton).toHaveClass("focus:ring-offset-2");
			expect(closeButton).toHaveClass("focus:outline-hidden");
		});

		it("should have proper close button icon sizing", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Check SVG sizing classes
			expect(closeButton).toHaveClass("[&_svg]:pointer-events-none");
			expect(closeButton).toHaveClass("[&_svg]:shrink-0");
			expect(closeButton).toHaveClass("[&_svg:not([class*='size-'])]:size-4");
		});
	});

	describe("background and styling", () => {
		it("should have proper background and border styling", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Check background and border
			expect(content).toHaveClass("bg-background");
			expect(content).toHaveClass("border");
			expect(content).toHaveClass("rounded-lg");
			expect(content).toHaveClass("shadow-lg");
		});
	});

	describe("grid layout", () => {
		it("should use grid layout for content", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Check grid layout
			expect(content).toHaveClass("grid");
			expect(content).toHaveClass("gap-4");
			expect(content).toHaveClass("w-full");
		});
	});

	describe("z-index and layering", () => {
		it("should have proper z-index for modal layering", () => {
			render(
				<Dialog open>
					<DialogContent data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");

			// Content should have z-50 for proper layering
			expect(content).toHaveClass("z-50");
		});
	});

	describe("accessibility", () => {
		it("should have proper screen reader support for close button", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Check for screen reader text
			const srText = closeButton.querySelector(".sr-only");
			expect(srText).toBeInTheDocument();
			expect(srText).toHaveTextContent("Close");
		});

		it("should be keyboard accessible", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Check that it's not disabled
			expect(closeButton).not.toHaveAttribute("disabled");
		});
	});

	describe("content rendering", () => {
		it("should render children content correctly", () => {
			render(
				<Dialog open>
					<DialogContent>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						<div data-testid="child-content">Custom Child Content</div>
					</DialogContent>
				</Dialog>,
			);

			const childContent = screen.getByTestId("child-content");
			expect(childContent).toBeInTheDocument();
			expect(childContent).toHaveTextContent("Custom Child Content");
		});

		it("should preserve custom className", () => {
			render(
				<Dialog open>
					<DialogContent className="custom-class" data-testid="content">
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
						Test Content
					</DialogContent>
				</Dialog>,
			);

			const content = screen.getByTestId("content");
			expect(content).toHaveClass("custom-class");
		});
	});
});
