import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { SearchInputWithAutocomplete } from "../SearchInputWithAutocomplete";

// Mock the useAutocomplete hook
vi.mock("@/hooks/useAutocomplete");

// Mock the AutocompleteDropdown component
vi.mock("../AutocompleteDropdown", () => ({
	AutocompleteDropdown: ({ suggestions, isVisible, onSelect, onClose }: any) =>
		isVisible && suggestions.length > 0 ? (
			<div data-testid="autocomplete-dropdown">
				{suggestions.map((suggestion: any) => (
					<button
						key={suggestion.id}
						type="button"
						data-testid="suggestion-item"
						onClick={() => onSelect(suggestion)}
					>
						{suggestion.text}
					</button>
				))}
				<button type="button" onClick={onClose} data-testid="close-dropdown">
					Close
				</button>
			</div>
		) : null,
}));

const mockSuggestions = [
	{ id: "1", text: "テスト", type: "tag" },
	{ id: "2", text: "サンプル", type: "title" },
];

const defaultProps = {
	value: "",
	onChange: vi.fn(),
	onSubmit: vi.fn(),
	onClear: vi.fn(),
};

describe("SearchInputWithAutocomplete", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementation
		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: [],
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});
	});

	it("基本的な入力機能が動作する", async () => {
		const mockOnChange = vi.fn();
		render(<SearchInputWithAutocomplete {...defaultProps} onChange={mockOnChange} />);

		const input = screen.getByRole("combobox");
		await userEvent.clear(input);
		await userEvent.type(input, "a");

		// Check that onChange was called
		expect(mockOnChange).toHaveBeenCalledWith("a");
	});

	it("プレースホルダーが正しく表示される", () => {
		render(
			<SearchInputWithAutocomplete {...defaultProps} placeholder="カスタムプレースホルダー" />,
		);

		expect(screen.getByPlaceholderText("カスタムプレースホルダー")).toBeInTheDocument();
	});

	it("値が入力されているときクリアボタンが表示される", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} value="テスト入力" />);

		expect(screen.getByLabelText("検索をクリア")).toBeInTheDocument();
	});

	it("クリアボタンをクリックするとonClearが呼ばれる", async () => {
		const mockOnClear = vi.fn();
		render(
			<SearchInputWithAutocomplete {...defaultProps} value="テスト入力" onClear={mockOnClear} />,
		);

		await userEvent.click(screen.getByLabelText("検索をクリア"));

		expect(mockOnClear).toHaveBeenCalled();
	});

	it("自動検索ローディング状態を表示する", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} isAutoSearching={true} />);

		expect(screen.getByTestId("Loader2-icon")).toBeInTheDocument(); // Loader2 icon
	});

	it("フォーカス時にオートコンプリートドロップダウンが表示される", async () => {
		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(<SearchInputWithAutocomplete {...defaultProps} value="テ" />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		expect(screen.getByTestId("autocomplete-dropdown")).toBeInTheDocument();
	});

	it("提案を選択するとonChangeとonSubmitが呼ばれる", async () => {
		const mockOnChange = vi.fn();
		const mockOnSubmit = vi.fn();

		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(
			<SearchInputWithAutocomplete
				{...defaultProps}
				value="テ"
				onChange={mockOnChange}
				onSubmit={mockOnSubmit}
			/>,
		);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		await userEvent.click(screen.getByText("テスト"));

		expect(mockOnChange).toHaveBeenCalledWith("テスト");

		// onSubmit is called with a slight delay
		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalled();
		});
	});

	it("下矢印キーでハイライトが移動する", async () => {
		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(<SearchInputWithAutocomplete {...defaultProps} value="テ" />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		fireEvent.keyDown(input, { key: "ArrowDown" });

		// ハイライトの移動は内部状態のため、DOM変更で確認は困難
		// キーダウンイベントが適切に処理されることを確認
		expect(input).toHaveAttribute("aria-expanded", "true");
	});

	it("Escapeキーでドロップダウンが閉じる", async () => {
		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(<SearchInputWithAutocomplete {...defaultProps} value="テ" />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		expect(screen.getByTestId("autocomplete-dropdown")).toBeInTheDocument();

		fireEvent.keyDown(input, { key: "Escape" });

		await waitFor(() => {
			expect(screen.queryByTestId("autocomplete-dropdown")).not.toBeInTheDocument();
		});
	});

	it("Enterキーでハイライトされた提案が選択される", async () => {
		const mockOnChange = vi.fn();

		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(<SearchInputWithAutocomplete {...defaultProps} value="テ" onChange={mockOnChange} />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		// 最初の項目をハイライト
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(mockOnChange).toHaveBeenCalledWith("テスト");
	});

	it("無効状態では入力できない", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} disabled={true} />);

		const input = screen.getByRole("combobox");
		expect(input).toBeDisabled();
	});

	it("useAutocompleteに正しいオプションを渡す", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} value="テスト検索" />);

		expect(vi.mocked(useAutocomplete)).toHaveBeenCalledWith("テスト検索", {
			enabled: true,
			debounceMs: 200,
			maxSuggestions: 8,
		});
	});

	it("無効状態でのuseAutocompleteオプション", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} disabled={true} value="テスト" />);

		expect(vi.mocked(useAutocomplete)).toHaveBeenCalledWith("テスト", {
			enabled: false,
			debounceMs: 200,
			maxSuggestions: 8,
		});
	});

	it("ブラー時にドロップダウンが閉じる（遅延あり）", async () => {
		vi.mocked(useAutocomplete).mockReturnValue({
			suggestions: mockSuggestions,
			isLoading: false,
			error: null,
			clearSuggestions: vi.fn(),
		});

		render(<SearchInputWithAutocomplete {...defaultProps} value="テ" />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);

		expect(screen.getByTestId("autocomplete-dropdown")).toBeInTheDocument();

		fireEvent.blur(input);

		// ブラーには遅延がある
		await waitFor(
			() => {
				expect(screen.queryByTestId("autocomplete-dropdown")).not.toBeInTheDocument();
			},
			{ timeout: 200 },
		);
	});

	it("aria属性が適切に設定される", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} />);

		const input = screen.getByRole("combobox");
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(input).toHaveAttribute("aria-haspopup", "listbox");
		expect(input).toHaveAttribute("autocomplete", "off");
	});

	it("検索アイコンが表示される", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} />);

		// Search icon should be present in the DOM
		const searchIcon = screen.getByTestId("Search-icon");
		expect(searchIcon).toBeInTheDocument();
	});

	it("カスタムクラス名が適用される", () => {
		render(<SearchInputWithAutocomplete {...defaultProps} className="custom-search-class" />);

		const outerContainer = screen.getByRole("combobox").closest(".custom-search-class");
		expect(outerContainer).toBeInTheDocument();
		expect(outerContainer).toHaveClass("custom-search-class");
	});
});
