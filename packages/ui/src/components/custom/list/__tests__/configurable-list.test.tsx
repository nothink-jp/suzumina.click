import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfigurableList } from "../configurable-list";
import type { FilterConfig } from "../core/types";

// Next.js のルーターをモック
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
}));

// サンプルデータ
const sampleItems = [
	{ id: 1, name: "Item 1", category: "A", price: 100, inStock: true },
	{ id: 2, name: "Item 2", category: "B", price: 200, inStock: false },
	{ id: 3, name: "Item 3", category: "A", price: 300, inStock: true },
	{ id: 4, name: "Item 4", category: "B", price: 400, inStock: true },
	{ id: 5, name: "Item 5", category: "C", price: 500, inStock: false },
];

const renderItem = (item: (typeof sampleItems)[0]) => (
	<div data-testid={`item-${item.id}`}>
		{item.name} - {item.category} - ¥{item.price}
	</div>
);

const filters: Record<string, FilterConfig> = {
	category: {
		type: "select",
		options: ["A", "B", "C"],
		showAll: true,
	},
	inStock: {
		type: "boolean",
	},
};

describe("ConfigurableList", () => {
	it("renders items correctly", () => {
		render(<ConfigurableList items={sampleItems} renderItem={renderItem} />);

		sampleItems.forEach((item) => {
			expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
		});
	});

	it("filters items by category", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				filters={filters}
				urlSync={false}
			/>,
		);

		// カテゴリーフィルターを選択
		const categorySelect = screen.getAllByRole("combobox")[0];
		fireEvent.click(categorySelect);
		fireEvent.click(screen.getByText("A"));

		await waitFor(() => {
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.getByTestId("item-3")).toBeInTheDocument();
			expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
			expect(screen.queryByTestId("item-4")).not.toBeInTheDocument();
		});
	});

	it("filters items by boolean filter", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				filters={filters}
				urlSync={false}
			/>,
		);

		// 在庫ありフィルターをクリック
		const stockButton = screen.getByRole("button", { name: "inStock" });
		fireEvent.click(stockButton);

		await waitFor(() => {
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.getByTestId("item-3")).toBeInTheDocument();
			expect(screen.getByTestId("item-4")).toBeInTheDocument();
			expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
			expect(screen.queryByTestId("item-5")).not.toBeInTheDocument();
		});
	});

	it("searches items by name", async () => {
		render(<ConfigurableList items={sampleItems} renderItem={renderItem} urlSync={false} />);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "Item 1" } });

		await waitFor(() => {
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
		});
	});

	it("sorts items", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				sorts={[
					{ value: "price", label: "価格順" },
					{ value: "name", label: "名前順" },
				]}
				urlSync={false}
			/>,
		);

		// ソート選択
		const sortSelect = screen.getAllByRole("combobox")[0];
		fireEvent.click(sortSelect);
		fireEvent.click(screen.getByText("価格順"));

		await waitFor(() => {
			const items = screen.getAllByTestId(/^item-/);
			expect(items[0]).toHaveAttribute("data-testid", "item-1");
			expect(items[1]).toHaveAttribute("data-testid", "item-2");
			expect(items[2]).toHaveAttribute("data-testid", "item-3");
		});
	});

	it("resets filters", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				filters={filters}
				urlSync={false}
			/>,
		);

		// フィルターを適用
		const categorySelect = screen.getAllByRole("combobox")[0];
		fireEvent.click(categorySelect);
		fireEvent.click(screen.getByText("A"));

		// リセットボタンが表示される
		await waitFor(() => {
			expect(screen.getByText("リセット")).toBeInTheDocument();
		});

		// リセットボタンをクリック
		fireEvent.click(screen.getByText("リセット"));

		// 全アイテムが表示される
		await waitFor(() => {
			sampleItems.forEach((item) => {
				expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
			});
		});
	});

	it("shows empty message when no items match", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				emptyMessage="商品が見つかりません"
				urlSync={false}
			/>,
		);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "NotFound" } });

		await waitFor(() => {
			expect(screen.getByText("検索結果がありません")).toBeInTheDocument();
		});
	});

	it("disables search when searchable is false", () => {
		render(<ConfigurableList items={sampleItems} renderItem={renderItem} searchable={false} />);

		expect(screen.queryByPlaceholderText("検索...")).not.toBeInTheDocument();
	});

	it("shows loading state", () => {
		render(<ConfigurableList items={[]} renderItem={renderItem} loading={true} />);

		// Skeletonが表示されることを確認
		const skeletons = document.querySelectorAll('[class*="h-24"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("shows custom loading component", () => {
		render(
			<ConfigurableList
				items={[]}
				renderItem={renderItem}
				loading={true}
				loadingComponent={<div data-testid="custom-loading">Loading...</div>}
			/>,
		);

		expect(screen.getByTestId("custom-loading")).toBeInTheDocument();
	});

	it("handles server-side data fetching", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			items: sampleItems.slice(0, 2),
			total: 5,
		});

		render(
			<ConfigurableList
				items={[]}
				renderItem={renderItem}
				fetchFn={mockFetch}
				dataAdapter={{
					toParams: (params) => params,
					fromResult: (result) => result,
				}}
			/>,
		);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.getByTestId("item-2")).toBeInTheDocument();
		});
	});
});
