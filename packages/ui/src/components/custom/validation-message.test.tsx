import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ValidationMessage, ValidationMessages } from "./validation-message";

describe("ValidationMessage", () => {
	describe("Basic Functionality", () => {
		it("displays message when visible", () => {
			render(<ValidationMessage variant="error" message="Test error message" isVisible={true} />);
			expect(screen.getByText("Test error message")).toBeInTheDocument();
		});

		it("does not render when not visible", () => {
			render(<ValidationMessage variant="error" message="Test error message" isVisible={false} />);
			expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
		});

		it("displays icon by default", () => {
			render(<ValidationMessage variant="error" message="Test message" isVisible={true} />);
			// AlertCircle icon for error variant
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		it("hides icon when showIcon is false", () => {
			const { container } = render(
				<ValidationMessage
					variant="error"
					message="Test message"
					isVisible={true}
					showIcon={false}
				/>,
			);
			// Should not have an SVG icon
			expect(container.querySelector("svg")).not.toBeInTheDocument();
		});
	});

	describe("Variants", () => {
		it("applies error variant styles", () => {
			const { container } = render(
				<ValidationMessage variant="error" message="Error message" isVisible={true} />,
			);
			expect(container.firstChild).toHaveClass("text-destructive");
		});

		it("applies warning variant styles", () => {
			const { container } = render(
				<ValidationMessage variant="warning" message="Warning message" isVisible={true} />,
			);
			expect(container.firstChild).toHaveClass("text-orange-600");
		});

		it("applies info variant styles", () => {
			const { container } = render(
				<ValidationMessage variant="info" message="Info message" isVisible={true} />,
			);
			expect(container.firstChild).toHaveClass("text-blue-600");
		});
	});

	describe("Styling Options", () => {
		it("applies custom className", () => {
			const { container } = render(
				<ValidationMessage
					variant="error"
					message="Test message"
					isVisible={true}
					className="custom-class"
				/>,
			);
			expect(container.firstChild).toHaveClass("custom-class");
		});

		it("applies compact styling", () => {
			const { container } = render(
				<ValidationMessage
					variant="error"
					message="Test message"
					isVisible={true}
					compact={true}
				/>,
			);
			expect(container.firstChild).toHaveClass("text-xs");
		});

		it("applies animation classes by default", () => {
			const { container } = render(
				<ValidationMessage variant="error" message="Test message" isVisible={true} />,
			);
			expect(container.firstChild).toHaveClass("animate-in");
		});

		it("does not apply animation when disabled", () => {
			const { container } = render(
				<ValidationMessage
					variant="error"
					message="Test message"
					isVisible={true}
					animated={false}
				/>,
			);
			expect(container.firstChild).not.toHaveClass("animate-in");
		});
	});

	describe("Accessibility", () => {
		it("has proper ARIA attributes", () => {
			render(<ValidationMessage variant="error" message="Test message" isVisible={true} />);
			const element = screen.getByRole("alert");
			expect(element).toHaveAttribute("aria-live", "polite");
		});

		it("maintains proper semantic structure", () => {
			const { container } = render(
				<ValidationMessage variant="error" message="Test message" isVisible={true} />,
			);
			expect((container.firstChild as Element)?.tagName).toBe("DIV");
			expect(container.querySelector("span")).toBeInTheDocument();
		});
	});
});

describe("ValidationMessages", () => {
	describe("TimeRange", () => {
		it("displays time range validation message", () => {
			render(<ValidationMessages.TimeRange isVisible={true} />);
			expect(screen.getByText("開始時間は終了時間より前にしてください")).toBeInTheDocument();
		});

		it("does not display when not visible", () => {
			render(<ValidationMessages.TimeRange isVisible={false} />);
			expect(screen.queryByText("開始時間は終了時間より前にしてください")).not.toBeInTheDocument();
		});
	});

	describe("MaxDuration", () => {
		it("displays max duration message with default value", () => {
			render(<ValidationMessages.MaxDuration isVisible={true} />);
			expect(screen.getByText("60秒以下にしてください")).toBeInTheDocument();
		});

		it("displays max duration message with custom value", () => {
			render(<ValidationMessages.MaxDuration maxSeconds={30} isVisible={true} />);
			expect(screen.getByText("30秒以下にしてください")).toBeInTheDocument();
		});
	});

	describe("MinDuration", () => {
		it("displays min duration message with default value", () => {
			render(<ValidationMessages.MinDuration isVisible={true} />);
			expect(screen.getByText("1秒以上にしてください")).toBeInTheDocument();
		});

		it("displays min duration message with custom value", () => {
			render(<ValidationMessages.MinDuration minSeconds={5} isVisible={true} />);
			expect(screen.getByText("5秒以上にしてください")).toBeInTheDocument();
		});
	});

	describe("Required", () => {
		it("displays required field message with default field name", () => {
			render(<ValidationMessages.Required isVisible={true} />);
			expect(screen.getByText("この項目は必須です")).toBeInTheDocument();
		});

		it("displays required field message with custom field name", () => {
			render(<ValidationMessages.Required fieldName="タイトル" isVisible={true} />);
			expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
		});
	});

	describe("MaxLength", () => {
		it("displays max length validation message", () => {
			render(<ValidationMessages.MaxLength maxLength={100} isVisible={true} />);
			expect(screen.getByText("100文字以下で入力してください")).toBeInTheDocument();
		});
	});

	describe("InvalidFormat", () => {
		it("displays invalid format message with default format", () => {
			render(<ValidationMessages.InvalidFormat isVisible={true} />);
			expect(screen.getByText("正しい形式で入力してください")).toBeInTheDocument();
		});

		it("displays invalid format message with custom format", () => {
			render(<ValidationMessages.InvalidFormat format="MM:SS.S形式" isVisible={true} />);
			expect(screen.getByText("MM:SS.S形式で入力してください")).toBeInTheDocument();
		});
	});

	describe("Props Forwarding", () => {
		it("forwards props to underlying ValidationMessage", () => {
			const { container } = render(
				<ValidationMessages.Required
					fieldName="テスト"
					isVisible={true}
					compact={true}
					className="test-class"
				/>,
			);
			expect(container.firstChild).toHaveClass("test-class");
			expect(container.firstChild).toHaveClass("text-xs");
		});
	});
});
