import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AutocompleteSuggestion } from "@/app/search/actions";
import { AutocompleteDropdown } from "./AutocompleteDropdown";

const mockSuggestions: AutocompleteSuggestion[] = [
	{
		id: "tag-test",
		text: "テスト",
		type: "tag",
		icon: "🏷️",
		count: 5,
	},
	{
		id: "title-sample",
		text: "サンプル音声",
		type: "title",
		count: 10,
	},
	{
		id: "video-example",
		text: "例動画",
		type: "video",
		icon: "📹",
	},
];

const defaultProps = {
	suggestions: mockSuggestions,
	isLoading: false,
	isVisible: true,
	onSelect: vi.fn(),
	onClose: vi.fn(),
	highlightedIndex: -1,
	onHighlightChange: vi.fn(),
};

describe("AutocompleteDropdown", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("非表示状態では何もレンダリングしない", () => {
		render(<AutocompleteDropdown {...defaultProps} isVisible={false} />);

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("提案リストを正しく表示する", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		expect(screen.getByRole("listbox")).toBeInTheDocument();
		expect(screen.getByText("テスト")).toBeInTheDocument();
		expect(screen.getByText("サンプル音声")).toBeInTheDocument();
		expect(screen.getByText("例動画")).toBeInTheDocument();
	});

	it("ローディング状態を表示する", () => {
		render(<AutocompleteDropdown {...defaultProps} isLoading={true} suggestions={[]} />);

		expect(screen.getByText("検索中...")).toBeInTheDocument();
	});

	it("提案がない場合のメッセージを表示する", () => {
		render(<AutocompleteDropdown {...defaultProps} suggestions={[]} />);

		expect(screen.getByText("候補が見つかりませんでした")).toBeInTheDocument();
	});

	it("提案をクリックしたときonSelectが呼ばれる", () => {
		const mockOnSelect = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onSelect={mockOnSelect} />);

		fireEvent.click(screen.getByText("テスト"));

		expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
	});

	it("マウスオーバーでonHighlightChangeが呼ばれる", () => {
		const mockOnHighlightChange = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onHighlightChange={mockOnHighlightChange} />);

		fireEvent.mouseEnter(screen.getByText("サンプル音声"));

		expect(mockOnHighlightChange).toHaveBeenCalledWith(1);
	});

	it("ハイライトされた項目に適切なスタイルが適用される", () => {
		render(<AutocompleteDropdown {...defaultProps} highlightedIndex={1} />);

		// Find the suggestion item wrapper div that should have the highlight style
		const highlightedItem = screen.getByText("サンプル音声").closest("[role='option']");
		expect(highlightedItem).toHaveClass("bg-suzuka-50");
	});

	it("提案の種類に応じた適切なバッジを表示する", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		expect(screen.getByText("タグ")).toBeInTheDocument();
		expect(screen.getByText("音声ボタン")).toBeInTheDocument();
		expect(screen.getByText("動画")).toBeInTheDocument();
	});

	it("アイコンを正しく表示する", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		expect(screen.getByText("🏷️")).toBeInTheDocument();
		expect(screen.getByText("📹")).toBeInTheDocument();
	});

	it("カウント数を表示する（人気タグ以外）", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();
	});

	it("人気タグ（count=999）のカウントは表示しない", () => {
		const suggestionsWithPopular: AutocompleteSuggestion[] = [
			{
				id: "popular-tag",
				text: "人気タグ",
				type: "tag",
				count: 999,
			},
		];

		render(<AutocompleteDropdown {...defaultProps} suggestions={suggestionsWithPopular} />);

		expect(screen.queryByText("999")).not.toBeInTheDocument();
	});

	it("カテゴリ情報を表示する", () => {
		const suggestionsWithCategory: AutocompleteSuggestion[] = [
			{
				id: "tag-with-category",
				text: "挨拶",
				type: "tag",
				category: "基本",
			},
		];

		render(<AutocompleteDropdown {...defaultProps} suggestions={suggestionsWithCategory} />);

		expect(screen.getByText("基本")).toBeInTheDocument();
	});

	it("role属性が適切に設定される", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		expect(screen.getByRole("listbox")).toBeInTheDocument();

		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(mockSuggestions.length);
	});

	it("aria-selected属性が適切に設定される", () => {
		render(<AutocompleteDropdown {...defaultProps} highlightedIndex={0} />);

		const options = screen.getAllByRole("option");
		expect(options[0]).toHaveAttribute("aria-selected", "true");
		expect(options[1]).toHaveAttribute("aria-selected", "false");
	});

	it("カスタムクラス名を適用する", () => {
		render(<AutocompleteDropdown {...defaultProps} className="custom-dropdown-class" />);

		const dropdown = screen.getByRole("listbox");
		expect(dropdown).toHaveClass("custom-dropdown-class");
	});

	it("外部クリックでonCloseが呼ばれる", () => {
		const mockOnClose = vi.fn();
		render(
			<div>
				<AutocompleteDropdown {...defaultProps} onClose={mockOnClose} />
				<button type="button">外部ボタン</button>
			</div>,
		);

		fireEvent.mouseDown(screen.getByText("外部ボタン"));

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("ドロップダウン内のクリックでonCloseが呼ばれない", () => {
		const mockOnClose = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onClose={mockOnClose} />);

		fireEvent.mouseDown(screen.getByRole("listbox"));

		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("長いテキストが適切に省略される", () => {
		const longTextSuggestions: AutocompleteSuggestion[] = [
			{
				id: "long-text",
				text: "これは非常に長いテキストで、コンテナの幅を超える可能性があります",
				type: "title",
			},
		];

		render(<AutocompleteDropdown {...defaultProps} suggestions={longTextSuggestions} />);

		const textElement = screen.getByText(
			"これは非常に長いテキストで、コンテナの幅を超える可能性があります",
		);
		expect(textElement.closest("div")).toHaveClass("truncate");
	});

	it("空の提案配列で適切にレンダリングする", () => {
		render(<AutocompleteDropdown {...defaultProps} suggestions={[]} />);

		expect(screen.getByRole("listbox")).toBeInTheDocument();
		expect(screen.getByText("候補が見つかりませんでした")).toBeInTheDocument();
	});
});
