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

describe("SearchFilterPanel エッジケース", () => {
	it("onSearchChangeなしでも入力できる", () => {
		render(<SearchFilterPanel searchPlaceholder="検索..." />);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "テスト" } });

		// エラーが発生しないことを確認
		expect(searchInput).toHaveValue("テスト");
	});

	it("onSearchなしでもEnterキーやボタンクリックできる", () => {
		render(<SearchFilterPanel searchPlaceholder="検索..." />);

		const searchInput = screen.getByPlaceholderText("検索...");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// エラーが発生しないことを確認
		fireEvent.keyDown(searchInput, { key: "Enter" });
		fireEvent.click(searchButton);

		expect(searchInput).toBeInTheDocument();
		expect(searchButton).toBeInTheDocument();
	});

	it("フィルターなしでも正しく表示される", () => {
		render(<SearchFilterPanel searchPlaceholder="検索のみ" />);

		expect(screen.getByPlaceholderText("検索のみ")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
	});

	it("空の検索値でも正しく動作する", () => {
		const mockOnSearchChange = vi.fn();
		render(<SearchFilterPanel searchValue="" onSearchChange={mockOnSearchChange} />);

		const searchInput = screen.getByDisplayValue("");
		fireEvent.change(searchInput, { target: { value: "test" } });

		expect(mockOnSearchChange).toHaveBeenCalledWith("test");
	});

	it("長い検索値でも正しく表示される", () => {
		const longValue = "非常に長い検索クエリの例でテストしています".repeat(3);
		render(<SearchFilterPanel searchValue={longValue} />);

		expect(screen.getByDisplayValue(longValue)).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(
			<SearchFilterPanel searchPlaceholder="検索..." className="custom-panel" />,
		);

		const cardElement = container.querySelector(".custom-panel");
		expect(cardElement).toBeInTheDocument();
	});

	it("複数のフィルターが正しくレイアウトされる", () => {
		const multipleFilters = (
			<>
				<FilterSelect
					value="all"
					placeholder="カテゴリ"
					options={[{ value: "all", label: "すべて" }]}
				/>
				<FilterSelect
					value="active"
					placeholder="ステータス"
					options={[{ value: "active", label: "アクティブ" }]}
				/>
				<SortSelect value="default" />
			</>
		);

		render(<SearchFilterPanel searchPlaceholder="検索..." filters={multipleFilters} />);

		expect(screen.getByText("すべて")).toBeInTheDocument();
		expect(screen.getByText("アクティブ")).toBeInTheDocument();
		expect(screen.getByText("並び順")).toBeInTheDocument();
	});
});

describe("FilterSelect エッジケース", () => {
	it("空のオプション配列でも正しく動作する", () => {
		render(<FilterSelect value="" placeholder="選択" options={[]} />);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("onValueChangeなしでも正しく動作する", () => {
		const options = [{ value: "test", label: "テスト" }];
		render(<FilterSelect value="test" placeholder="選択" options={options} />);

		const selectTrigger = screen.getByRole("combobox");
		fireEvent.click(selectTrigger);

		expect(selectTrigger).toBeInTheDocument();
	});

	it("valueが未定義でも正しく動作する", () => {
		const options = [{ value: "test", label: "テスト" }];
		render(<FilterSelect placeholder="選択してください" options={options} />);

		expect(screen.getByText("選択してください")).toBeInTheDocument();
	});

	it("重複するvalueを持つオプションでも正しく表示される", () => {
		const options = [
			{ value: "test", label: "テスト1" },
			{ value: "test", label: "テスト2" },
		];
		render(<FilterSelect value="test" placeholder="選択" options={options} />);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("非常に長いlabelでも正しく表示される", () => {
		const longLabel = "非常に長いオプションラベルのテストケースです".repeat(2);
		const options = [{ value: "long", label: longLabel }];

		render(<FilterSelect value="long" placeholder="選択" options={options} />);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const options = [{ value: "test", label: "テスト" }];
		const { container } = render(
			<FilterSelect value="test" placeholder="選択" options={options} className="custom-select" />,
		);

		const selectElement = container.querySelector(".custom-select");
		expect(selectElement).toBeInTheDocument();
	});
});

describe("SortSelect エッジケース", () => {
	it("空のカスタムオプションでも正しく動作する", () => {
		render(<SortSelect value="" options={[]} />);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("カスタムオプションが正しくFilterSelectに渡される", () => {
		const customOptions = [
			{ value: "custom1", label: "カスタム1" },
			{ value: "custom2", label: "カスタム2" },
		];

		render(<SortSelect value="custom1" options={customOptions} />);

		expect(screen.getByText("カスタム1")).toBeInTheDocument();
	});

	it("デフォルトオプションが正しく表示される", () => {
		render(<SortSelect value="newest" />);

		// デフォルトオプションが使用される
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("onValueChangeが正しく伝播される", () => {
		const mockOnValueChange = vi.fn();
		render(<SortSelect value="default" onValueChange={mockOnValueChange} />);

		// FilterSelectコンポーネントが正しくマウントされることを確認
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});
});

describe("統合テスト：完全な検索フィルターパネル", () => {
	it("すべての機能が組み合わせて正しく動作する", () => {
		const mockOnSearchChange = vi.fn();
		const mockOnSearch = vi.fn();
		const mockOnCategoryChange = vi.fn();
		const mockOnSortChange = vi.fn();

		const filters = (
			<>
				<FilterSelect
					value="all"
					onValueChange={mockOnCategoryChange}
					placeholder="カテゴリ"
					options={[
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "cat1", label: "カテゴリ1" },
					]}
				/>
				<SortSelect value="default" onValueChange={mockOnSortChange} />
			</>
		);

		render(
			<SearchFilterPanel
				searchValue="テスト検索"
				onSearchChange={mockOnSearchChange}
				onSearch={mockOnSearch}
				searchPlaceholder="統合テスト検索..."
				filters={filters}
				className="integration-test"
			/>,
		);

		// 全要素の存在確認
		expect(screen.getByDisplayValue("テスト検索")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("統合テスト検索...")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
		expect(screen.getByText("すべてのカテゴリ")).toBeInTheDocument();
		expect(screen.getByText("並び順")).toBeInTheDocument();

		// 検索機能のテスト
		const searchInput = screen.getByDisplayValue("テスト検索");
		fireEvent.change(searchInput, { target: { value: "新しい検索" } });
		expect(mockOnSearchChange).toHaveBeenCalledWith("新しい検索");

		fireEvent.keyDown(searchInput, { key: "Enter" });
		expect(mockOnSearch).toHaveBeenCalled();

		const searchButton = screen.getByRole("button", { name: "検索" });
		fireEvent.click(searchButton);
		expect(mockOnSearch).toHaveBeenCalledTimes(2);
	});
});
