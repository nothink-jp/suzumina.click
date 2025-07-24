import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutocompleteDropdown, type AutocompleteSuggestionItem } from "../autocomplete-dropdown";

describe("AutocompleteDropdown", () => {
	const mockItems: AutocompleteSuggestionItem<string>[] = [
		{ id: "1", value: "Item 1" },
		{ id: "2", value: "Item 2" },
		{ id: "3", value: "Item 3" },
	];

	const mockRenderItem = (item: AutocompleteSuggestionItem<string>, isHighlighted: boolean) => (
		<div data-testid={`item-${item.id}`} className={isHighlighted ? "highlighted" : ""}>
			{item.value}
		</div>
	);

	const defaultProps = {
		items: mockItems,
		isVisible: true,
		onSelect: vi.fn(),
		onClose: vi.fn(),
		highlightedIndex: -1,
		onHighlightChange: vi.fn(),
		renderItem: mockRenderItem,
	};

	it("表示/非表示が正しく制御される", () => {
		const { rerender } = render(<AutocompleteDropdown {...defaultProps} isVisible={false} />);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

		rerender(<AutocompleteDropdown {...defaultProps} isVisible={true} />);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	it("アイテムが正しくレンダリングされる", () => {
		render(<AutocompleteDropdown {...defaultProps} />);

		mockItems.forEach((item) => {
			expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
			expect(screen.getByText(item.value)).toBeInTheDocument();
		});
	});

	it("ローディング状態が表示される", () => {
		render(
			<AutocompleteDropdown {...defaultProps} isLoading={true} loadingMessage="読み込み中..." />,
		);

		expect(screen.getByText("読み込み中...")).toBeInTheDocument();
		expect(screen.queryByTestId("item-1")).not.toBeInTheDocument();
	});

	it("空状態が表示される", () => {
		render(<AutocompleteDropdown {...defaultProps} items={[]} emptyMessage="データがありません" />);

		expect(screen.getByText("データがありません")).toBeInTheDocument();
	});

	it("クリックでアイテムが選択される", () => {
		const onSelect = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />);

		fireEvent.click(screen.getByTestId("item-2"));
		expect(onSelect).toHaveBeenCalledWith(mockItems[1]);
	});

	it("マウスエンターでハイライトが変更される", () => {
		const onHighlightChange = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onHighlightChange={onHighlightChange} />);

		const itemElement = screen.getByTestId("item-2").parentElement;
		if (itemElement) {
			fireEvent.mouseEnter(itemElement);
			expect(onHighlightChange).toHaveBeenCalledWith(1);
		}
	});

	it("ハイライトされたアイテムにスタイルが適用される", () => {
		render(<AutocompleteDropdown {...defaultProps} highlightedIndex={1} />);

		expect(screen.getByTestId("item-2")).toHaveClass("highlighted");
		expect(screen.getByTestId("item-1")).not.toHaveClass("highlighted");
	});

	it("外側クリックでドロップダウンが閉じる", () => {
		const onClose = vi.fn();
		render(
			<div>
				<button data-testid="outside">Outside</button>
				<AutocompleteDropdown {...defaultProps} onClose={onClose} />
			</div>,
		);

		fireEvent.mouseDown(screen.getByTestId("outside"));
		expect(onClose).toHaveBeenCalled();
	});

	it("キーボード操作でアイテムが選択される", () => {
		const onSelect = vi.fn();
		render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />);

		const itemElement = screen.getByTestId("item-2").parentElement;
		if (itemElement) {
			fireEvent.keyDown(itemElement, { key: "Enter" });
			expect(onSelect).toHaveBeenCalledWith(mockItems[1]);

			onSelect.mockClear();
			fireEvent.keyDown(itemElement, { key: " " });
			expect(onSelect).toHaveBeenCalledWith(mockItems[1]);
		}
	});
});
