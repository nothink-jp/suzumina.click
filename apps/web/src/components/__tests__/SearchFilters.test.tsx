import type { UnifiedSearchFilters } from "@suzumina.click/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchFilters } from "../SearchFilters";

const mockFilters: UnifiedSearchFilters = {
	query: "test",
	type: "all",
	limit: 12,
	sortBy: "relevance",
	tagMode: "any",
};

const mockOnFiltersChange = vi.fn();
const mockOnApply = vi.fn();

describe("SearchFilters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render filter button", () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="all"
			/>,
		);

		expect(screen.getByRole("button", { name: /フィルター/i })).toBeInTheDocument();
	});

	it("should show active filter count when filters are applied", () => {
		const filtersWithActive: UnifiedSearchFilters = {
			...mockFilters,
			playCountMin: 10,
			likeCountMin: 5,
		};

		render(
			<SearchFilters
				filters={filtersWithActive}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="all"
			/>,
		);

		// フィルターボタンにアクティブなフィルター数が表示されることを確認
		expect(screen.getByText("2")).toBeInTheDocument(); // フィルター数のバッジ
	});

	it("should display date range filter options", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="all"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// 日付範囲のオプションが表示されることを確認
		await waitFor(() => {
			expect(screen.getByLabelText("今日")).toBeInTheDocument();
			expect(screen.getByLabelText("今週")).toBeInTheDocument();
			expect(screen.getByLabelText("今月")).toBeInTheDocument();
			expect(screen.getByLabelText("過去30日")).toBeInTheDocument();
			expect(screen.getByLabelText("カスタム")).toBeInTheDocument();
		});
	});

	it("should display numeric range filters for audio buttons", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="buttons"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// 数値範囲フィルターが表示されることを確認
		await waitFor(() => {
			expect(screen.getByText("再生数")).toBeInTheDocument();
			expect(screen.getByText("いいね数")).toBeInTheDocument();
			expect(screen.getByText("お気に入り数")).toBeInTheDocument();
			expect(screen.getByText("音声の長さ")).toBeInTheDocument();
		});
	});

	it("should not display audio button filters for non-button content types", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="videos"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// 音声ボタン専用フィルターが表示されないことを確認
		await waitFor(() => {
			expect(screen.queryByText("再生数")).not.toBeInTheDocument();
			expect(screen.queryByText("いいね数")).not.toBeInTheDocument();
		});
	});

	it("should handle filter application", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="all"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// 適用ボタンをクリック
		const applyButton = await screen.findByRole("button", { name: /フィルターを適用/i });
		fireEvent.click(applyButton);

		await waitFor(() => {
			expect(mockOnApply).toHaveBeenCalledTimes(1);
		});
	});

	it("should handle filter reset", async () => {
		const filtersWithValues: UnifiedSearchFilters = {
			...mockFilters,
			playCountMin: 10,
			dateRange: "today",
		};

		render(
			<SearchFilters
				filters={filtersWithValues}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="all"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// リセットボタンをクリック
		const resetButton = await screen.findByRole("button", { name: /リセット/i });
		fireEvent.click(resetButton);

		await waitFor(() => {
			expect(mockOnFiltersChange).toHaveBeenCalledWith({
				query: mockFilters.query,
				type: mockFilters.type,
				limit: mockFilters.limit,
				sortBy: "relevance",
				tagMode: "any",
			});
			expect(mockOnApply).toHaveBeenCalledTimes(1);
		});
	});

	it("should update numeric filters", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="buttons"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// 再生数セクションがあることを確認
		await waitFor(() => {
			expect(screen.getByText("再生数")).toBeInTheDocument();
		});

		// 適用ボタンをクリック
		const applyButton = await screen.findByRole("button", { name: /フィルターを適用/i });
		fireEvent.click(applyButton);

		await waitFor(() => {
			expect(mockOnApply).toHaveBeenCalledTimes(1);
		});
	});

	it("should handle sort order change", async () => {
		render(
			<SearchFilters
				filters={mockFilters}
				onFiltersChange={mockOnFiltersChange}
				onApply={mockOnApply}
				contentType="buttons"
			/>,
		);

		// フィルターボタンをクリックして開く
		const filterButtons = screen.getAllByRole("button");
		const mainFilterButton = filterButtons.find(
			(button) => button.textContent?.includes("フィルター") && !button.getAttribute("aria-label"),
		);
		expect(mainFilterButton).toBeDefined();
		fireEvent.click(mainFilterButton!);

		// ソート順の選択があることを確認
		await waitFor(() => {
			expect(screen.getByText("並び順")).toBeInTheDocument();
		});

		// 適用ボタンをクリック
		const applyButton = await screen.findByRole("button", { name: /フィルターを適用/i });
		fireEvent.click(applyButton);

		await waitFor(() => {
			expect(mockOnApply).toHaveBeenCalledTimes(1);
		});
	});
});
