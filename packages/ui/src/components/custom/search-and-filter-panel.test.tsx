import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchAndFilterPanel } from "./search-and-filter-panel";

describe("SearchAndFilterPanel", () => {
	it("renders search input with placeholder", () => {
		render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={vi.fn()}
				searchPlaceholder="Search test..."
			/>,
		);

		expect(screen.getByPlaceholderText("Search test...")).toBeInTheDocument();
	});

	it("calls onSearchChange when input value changes", () => {
		const mockOnSearchChange = vi.fn();
		render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={mockOnSearchChange}
				onSearch={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "test query" } });

		expect(mockOnSearchChange).toHaveBeenCalledWith("test query");
	});

	it("calls onSearch when Enter key is pressed", () => {
		const mockOnSearch = vi.fn();
		render(
			<SearchAndFilterPanel
				searchValue="test"
				onSearchChange={vi.fn()}
				onSearch={mockOnSearch}
				onReset={vi.fn()}
			/>,
		);

		const input = screen.getByRole("textbox");
		fireEvent.keyDown(input, { key: "Enter" });

		expect(mockOnSearch).toHaveBeenCalled();
	});

	it("calls onSearch when search button is clicked", () => {
		const mockOnSearch = vi.fn();
		render(
			<SearchAndFilterPanel
				searchValue="test"
				onSearchChange={vi.fn()}
				onSearch={mockOnSearch}
				onReset={vi.fn()}
			/>,
		);

		const searchButton = screen.getByLabelText("検索");
		fireEvent.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalled();
	});

	it("calls onReset when reset button is clicked", () => {
		const mockOnReset = vi.fn();
		render(
			<SearchAndFilterPanel
				searchValue="test"
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={mockOnReset}
				hasActiveFilters={true}
			/>,
		);

		const resetButton = screen.getByLabelText("検索・フィルターをリセット");
		fireEvent.click(resetButton);

		expect(mockOnReset).toHaveBeenCalled();
	});

	it("shows reset button when hasActiveFilters is true", () => {
		render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={vi.fn()}
				hasActiveFilters={true}
			/>,
		);

		expect(screen.getByLabelText("検索・フィルターをリセット")).toBeInTheDocument();
	});

	it("hides reset button when hasActiveFilters is false", () => {
		render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={vi.fn()}
				hasActiveFilters={false}
			/>,
		);

		expect(screen.queryByLabelText("検索・フィルターをリセット")).not.toBeInTheDocument();
	});

	it("renders filters when provided", () => {
		render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={vi.fn()}
				filters={<div data-testid="test-filter">Test Filter</div>}
			/>,
		);

		expect(screen.getByTestId("test-filter")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(
			<SearchAndFilterPanel
				searchValue=""
				onSearchChange={vi.fn()}
				onSearch={vi.fn()}
				onReset={vi.fn()}
				className="custom-class"
			/>,
		);

		expect(container.firstChild).toHaveClass("custom-class");
	});
});
