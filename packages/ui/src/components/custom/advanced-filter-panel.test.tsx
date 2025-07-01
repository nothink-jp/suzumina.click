import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdvancedFilterPanel, type AdvancedFilters } from "./advanced-filter-panel";

describe("AdvancedFilterPanel", () => {
	const mockOnChange = vi.fn();
	const mockOnApply = vi.fn();

	const defaultFilters: AdvancedFilters = {
		playCount: { min: undefined, max: undefined },
		likeCount: { min: undefined, max: undefined },
		favoriteCount: { min: undefined, max: undefined },
		duration: { min: undefined, max: undefined },
		createdAt: { from: undefined, to: undefined },
	};

	beforeEach(() => {
		mockOnChange.mockClear();
		mockOnApply.mockClear();
	});

	it("基本的なレンダリングが正しく行われる", () => {
		render(<AdvancedFilterPanel filters={defaultFilters} onChange={mockOnChange} />);

		expect(screen.getByText("高度フィルタ")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /高度フィルタ/ })).toBeInTheDocument();
	});

	it("フィルターパネルを開くことができる", async () => {
		const user = userEvent.setup();
		render(<AdvancedFilterPanel filters={defaultFilters} onChange={mockOnChange} />);

		// パネルを開く
		const toggleButton = screen.getByRole("button", { name: /高度フィルタ/ });
		await user.click(toggleButton);

		// パネルが開いていることを確認
		expect(toggleButton).toHaveAttribute("aria-expanded", "true");
	});

	it("アクティブなフィルターがある場合リセットボタンが表示される", () => {
		const filtersWithValues: AdvancedFilters = {
			playCount: { min: 10 },
			likeCount: { min: undefined, max: undefined },
			favoriteCount: { min: undefined, max: undefined },
			duration: { min: undefined, max: undefined },
			createdAt: { from: undefined, to: undefined },
		};

		render(<AdvancedFilterPanel filters={filtersWithValues} onChange={mockOnChange} />);

		expect(screen.getByText("リセット")).toBeInTheDocument();
	});

	it("アクティブフィルター数がバッジに表示される", () => {
		const filtersWithValues: AdvancedFilters = {
			playCount: { min: 10 },
			likeCount: { min: 5 },
			favoriteCount: { min: undefined, max: undefined },
			duration: { min: undefined, max: undefined },
			createdAt: { from: undefined, to: undefined },
		};

		render(<AdvancedFilterPanel filters={filtersWithValues} onChange={mockOnChange} />);

		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("リセットボタンでフィルターがクリアされる", async () => {
		const user = userEvent.setup();
		const filtersWithValues: AdvancedFilters = {
			playCount: { min: 10 },
			likeCount: { min: 5 },
			favoriteCount: { min: undefined, max: undefined },
			duration: { min: undefined, max: undefined },
			createdAt: { from: undefined, to: undefined },
		};

		render(<AdvancedFilterPanel filters={filtersWithValues} onChange={mockOnChange} />);

		const resetButton = screen.getByText("リセット");
		await user.click(resetButton);

		expect(mockOnChange).toHaveBeenCalledWith({
			playCount: { min: undefined, max: undefined },
			likeCount: { min: undefined, max: undefined },
			favoriteCount: { min: undefined, max: undefined },
			duration: { min: undefined, max: undefined },
			createdAt: { from: undefined, to: undefined },
			createdBy: undefined,
		});
	});

	it("onApplyプロパティがある場合適用ボタンが表示される", async () => {
		const user = userEvent.setup();
		render(
			<AdvancedFilterPanel
				filters={defaultFilters}
				onChange={mockOnChange}
				onApply={mockOnApply}
			/>,
		);

		// パネルを開く
		const toggleButton = screen.getByRole("button", { name: /高度フィルタ/ });
		await user.click(toggleButton);

		expect(screen.getByText("フィルタを適用")).toBeInTheDocument();
		expect(screen.getByText("閉じる")).toBeInTheDocument();
	});

	it("カスタムクラス名が適用される", () => {
		const { container } = render(
			<AdvancedFilterPanel
				filters={defaultFilters}
				onChange={mockOnChange}
				className="custom-class"
			/>,
		);

		expect(container.firstChild).toHaveClass("custom-class");
	});
});
