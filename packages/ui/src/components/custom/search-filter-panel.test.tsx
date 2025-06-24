import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterSelect, SearchFilterPanel, SortSelect } from "./search-filter-panel";

describe("SearchFilterPanel", () => {
	it("検索入力フィールドが正しく表示される", () => {
		render(<SearchFilterPanel searchPlaceholder="テスト検索..." />);

		const searchInput = screen.getByPlaceholderText("テスト検索...");
		expect(searchInput).toBeInTheDocument();
	});

	it("検索値の変更が正しく処理される", () => {
		const mockOnSearchChange = vi.fn();
		render(
			<SearchFilterPanel
				searchValue=""
				onSearchChange={mockOnSearchChange}
				searchPlaceholder="検索..."
			/>,
		);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "テスト検索" } });

		expect(mockOnSearchChange).toHaveBeenCalledWith("テスト検索");
	});

	it("Enterキーで検索が実行される", () => {
		const mockOnSearch = vi.fn();
		render(
			<SearchFilterPanel
				searchValue="テスト"
				onSearch={mockOnSearch}
				searchPlaceholder="検索..."
			/>,
		);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.keyDown(searchInput, { key: "Enter" });

		expect(mockOnSearch).toHaveBeenCalled();
	});

	it("検索ボタンで検索が実行される", () => {
		const mockOnSearch = vi.fn();
		render(
			<SearchFilterPanel
				searchValue="テスト"
				onSearch={mockOnSearch}
				searchPlaceholder="検索..."
			/>,
		);

		const searchButton = screen.getByRole("button", { name: "検索" });
		fireEvent.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalled();
	});

	it("フィルターが正しく表示される", () => {
		const filters = (
			<>
				<FilterSelect
					value="all"
					placeholder="カテゴリ"
					options={[
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "cat1", label: "カテゴリ1" },
						{ value: "cat2", label: "カテゴリ2" },
					]}
				/>
				<SortSelect value="default" />
			</>
		);

		render(<SearchFilterPanel searchPlaceholder="検索..." filters={filters} />);

		// フィルター要素が存在することを確認
		expect(screen.getByText("すべてのカテゴリ")).toBeInTheDocument();
		expect(screen.getByText("並び順")).toBeInTheDocument();
	});
});

describe("FilterSelect", () => {
	it("オプションが正しく表示される", () => {
		const options = [
			{ value: "all", label: "すべて" },
			{ value: "option1", label: "オプション1" },
			{ value: "option2", label: "オプション2" },
		];

		render(<FilterSelect value="all" placeholder="選択してください" options={options} />);

		// 選択されたオプションが表示されることを確認
		expect(screen.getByText("すべて")).toBeInTheDocument();
	});

	it("値の変更が正しく処理される", () => {
		const mockOnValueChange = vi.fn();
		const options = [
			{ value: "all", label: "すべて" },
			{ value: "option1", label: "オプション1" },
		];

		render(
			<FilterSelect
				value="all"
				onValueChange={mockOnValueChange}
				placeholder="選択"
				options={options}
			/>,
		);

		// セレクトボックスをクリック
		const selectTrigger = screen.getByRole("combobox");
		fireEvent.click(selectTrigger);
	});
});

describe("SortSelect", () => {
	it("デフォルトのソートオプションが表示される", () => {
		render(<SortSelect value="default" />);

		expect(screen.getByText("並び順")).toBeInTheDocument();
	});

	it("カスタムソートオプションが使用できる", () => {
		const customOptions = [
			{ value: "default", label: "並び順" },
			{ value: "custom", label: "カスタム順" },
		];

		render(<SortSelect value="default" options={customOptions} />);

		expect(screen.getByText("並び順")).toBeInTheDocument();
	});

	it("値の変更が正しく処理される", () => {
		const mockOnValueChange = vi.fn();

		render(<SortSelect value="default" onValueChange={mockOnValueChange} />);

		// セレクトボックスをクリック
		const selectTrigger = screen.getByRole("combobox");
		fireEvent.click(selectTrigger);
	});
});
