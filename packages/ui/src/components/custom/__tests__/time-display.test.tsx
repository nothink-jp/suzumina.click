import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimeDisplay } from "../time-display";

describe("TimeDisplay", () => {
	describe("Basic Functionality", () => {
		it("displays time in mm:ss.s format correctly", () => {
			render(<TimeDisplay time={123.4} format="mm:ss.s" />);
			expect(screen.getByText("2:03.4")).toBeInTheDocument();
		});

		it("displays time in h:mm:ss.s format correctly", () => {
			render(<TimeDisplay time={3723.8} format="h:mm:ss.s" />);
			expect(screen.getByText("1:02:03.8")).toBeInTheDocument();
		});

		it("displays short time correctly", () => {
			render(<TimeDisplay time={45.7} format="mm:ss.s" />);
			expect(screen.getByText("0:45.7")).toBeInTheDocument();
		});

		it("displays zero time correctly", () => {
			render(<TimeDisplay time={0} format="mm:ss.s" />);
			expect(screen.getByText("0:00.0")).toBeInTheDocument();
		});
	});

	describe("Auto Format", () => {
		it("uses mm:ss.s format for time under 1 hour", () => {
			render(<TimeDisplay time={3599.9} format="auto" />);
			expect(screen.getByText("59:59.9")).toBeInTheDocument();
		});

		it("uses h:mm:ss.s format for time over 1 hour", () => {
			render(<TimeDisplay time={3600.1} format="auto" />);
			expect(screen.getByText("1:00:00.0")).toBeInTheDocument(); // 0.1秒は小数点以下切り捨て
		});

		it("defaults to auto format when not specified", () => {
			render(<TimeDisplay time={125.3} />);
			expect(screen.getByText("2:05.2")).toBeInTheDocument(); // 0.3は0.2に丸められる
		});
	});

	describe("Labels", () => {
		it("displays label when showLabel is true", () => {
			render(<TimeDisplay time={60.5} showLabel />);
			expect(screen.getByText("時間:")).toBeInTheDocument();
			expect(screen.getByText("1:00.5")).toBeInTheDocument();
		});

		it("displays custom label", () => {
			render(<TimeDisplay time={30.2} showLabel label="再生時間" />);
			expect(screen.getByText("再生時間:")).toBeInTheDocument();
		});

		it("does not display label when showLabel is false", () => {
			render(<TimeDisplay time={45.1} showLabel={false} label="再生時間" />);
			expect(screen.queryByText("再生時間:")).not.toBeInTheDocument();
		});
	});

	describe("Invalid Values", () => {
		it("displays invalid text for NaN", () => {
			render(<TimeDisplay time={Number.NaN} />);
			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("displays invalid text for negative values", () => {
			render(<TimeDisplay time={-10.5} />);
			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("displays invalid text for infinite values", () => {
			render(<TimeDisplay time={Number.POSITIVE_INFINITY} />);
			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("displays custom invalid text", () => {
			render(<TimeDisplay time={Number.NaN} invalidText="エラー" />);
			expect(screen.getByText("エラー")).toBeInTheDocument();
		});

		it("displays label with invalid value", () => {
			render(<TimeDisplay time={Number.NaN} showLabel label="時間" />);
			expect(screen.getByText("時間:")).toBeInTheDocument();
			expect(screen.getByText("無効")).toBeInTheDocument();
		});
	});

	describe("CSS Classes", () => {
		it("applies custom className", () => {
			const { container } = render(<TimeDisplay time={60.0} className="custom-class" />);
			expect(container.firstChild).toHaveClass("custom-class");
		});

		it("applies custom labelClassName", () => {
			render(
				<TimeDisplay time={60.0} showLabel label="時間" labelClassName="custom-label-class" />,
			);
			const label = screen.getByText("時間:");
			expect(label).toHaveClass("custom-label-class");
		});

		it("applies font-mono class by default", () => {
			const { container } = render(<TimeDisplay time={60.0} />);
			expect(container.firstChild).toHaveClass("font-mono");
		});

		it("applies text-destructive class for invalid values", () => {
			const { container } = render(<TimeDisplay time={Number.NaN} />);
			expect(container.firstChild).toHaveClass("text-destructive");
		});
	});

	describe("Edge Cases", () => {
		it("handles very small decimal values", () => {
			render(<TimeDisplay time={0.1} format="mm:ss.s" />);
			expect(screen.getByText("0:00.1")).toBeInTheDocument();
		});

		it("handles very large values", () => {
			render(<TimeDisplay time={86400.5} format="h:mm:ss.s" />); // 24 hours
			expect(screen.getByText("24:00:00.5")).toBeInTheDocument();
		});

		it("handles decimal precision correctly", () => {
			render(<TimeDisplay time={123.456} format="mm:ss.s" />);
			expect(screen.getByText("2:03.4")).toBeInTheDocument(); // Should truncate to 1 decimal
		});

		it("handles exact hour boundaries", () => {
			render(<TimeDisplay time={3600} format="h:mm:ss.s" />);
			expect(screen.getByText("1:00:00.0")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has proper semantic structure", () => {
			render(<TimeDisplay time={60.5} showLabel label="再生時間" />);
			const container = screen.getByText("再生時間:").parentElement;
			expect(container?.tagName).toBe("SPAN");
		});

		it("maintains readable text content", () => {
			const { container } = render(<TimeDisplay time={123.4} showLabel label="時間" />);
			expect(container.textContent).toBe("時間:2:03.4"); // スペースなし
		});
	});
});
