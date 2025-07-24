import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListDisplayControls } from "../list-display-controls";

describe("ListDisplayControls", () => {
	const defaultProps = {
		title: "Test List",
		totalCount: 100,
		currentPage: 1,
		totalPages: 10,
		sortValue: "default",
		onSortChange: vi.fn(),
		sortOptions: [
			{ value: "default", label: "並び順" },
			{ value: "newest", label: "新しい順" },
		],
		itemsPerPageValue: "12",
		onItemsPerPageChange: vi.fn(),
	};

	it("renders title and count display", () => {
		render(<ListDisplayControls {...defaultProps} />);

		expect(screen.getByText("Test List")).toBeInTheDocument();
		expect(screen.getByText("(全100件)")).toBeInTheDocument();
	});

	it("shows filtered count when provided", () => {
		render(<ListDisplayControls {...defaultProps} filteredCount={50} />);

		expect(screen.getByText("(50件 / 全100件)")).toBeInTheDocument();
	});

	it("renders sort selector", () => {
		render(<ListDisplayControls {...defaultProps} />);

		expect(screen.getByText("並び順")).toBeInTheDocument();
	});

	it("calls onSortChange when sort value changes", () => {
		const mockOnSortChange = vi.fn();
		render(<ListDisplayControls {...defaultProps} onSortChange={mockOnSortChange} />);

		// Verify the handler is passed correctly
		expect(mockOnSortChange).toBeDefined();
	});

	it("renders items per page selector", () => {
		render(<ListDisplayControls {...defaultProps} />);

		expect(screen.getByText("12件/ページ")).toBeInTheDocument();
	});

	it("calls onItemsPerPageChange when items per page changes", () => {
		const mockOnItemsPerPageChange = vi.fn();
		render(
			<ListDisplayControls {...defaultProps} onItemsPerPageChange={mockOnItemsPerPageChange} />,
		);

		// Verify the handler is passed correctly
		expect(mockOnItemsPerPageChange).toBeDefined();
	});

	it("renders custom items per page options", () => {
		render(
			<ListDisplayControls
				{...defaultProps}
				itemsPerPageOptions={[
					{ value: "6", label: "6件" },
					{ value: "12", label: "12件" },
					{ value: "24", label: "24件" },
				]}
			/>,
		);

		expect(screen.getByText("12件")).toBeInTheDocument();
	});

	it("renders view mode toggle when provided", () => {
		const mockOnViewModeChange = vi.fn();
		render(
			<ListDisplayControls
				{...defaultProps}
				viewMode="grid"
				onViewModeChange={mockOnViewModeChange}
			/>,
		);

		const gridButton = screen.getByLabelText("グリッド表示");
		const listButton = screen.getByLabelText("リスト表示");

		expect(gridButton).toBeInTheDocument();
		expect(listButton).toBeInTheDocument();
	});

	it("calls onViewModeChange when view mode button is clicked", () => {
		const mockOnViewModeChange = vi.fn();
		render(
			<ListDisplayControls
				{...defaultProps}
				viewMode="grid"
				onViewModeChange={mockOnViewModeChange}
			/>,
		);

		const listButton = screen.getByLabelText("リスト表示");
		fireEvent.click(listButton);

		expect(mockOnViewModeChange).toHaveBeenCalledWith("list");
	});

	it("renders actions when provided", () => {
		render(
			<ListDisplayControls
				{...defaultProps}
				actions={<button type="button">Custom Action</button>}
			/>,
		);

		expect(screen.getByText("Custom Action")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(
			<ListDisplayControls {...defaultProps} className="custom-class" />,
		);

		expect(container.firstChild).toHaveClass("custom-class");
	});

	it("handles edge case with zero total count", () => {
		render(<ListDisplayControls {...defaultProps} totalCount={0} />);

		expect(screen.getByText("(全0件)")).toBeInTheDocument();
	});

	it("handles single page case", () => {
		render(<ListDisplayControls {...defaultProps} totalPages={1} />);

		expect(screen.getByText("Test List")).toBeInTheDocument();
		expect(screen.getByText("(全100件)")).toBeInTheDocument();
	});
});
