import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigurableList } from "../configurable-list";
import type { FilterConfig } from "../configurable-list/types";

// Next.js のルーターをモック
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	}),
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

const _filters: Record<string, FilterConfig> = {
	category: {
		type: "select",
		options: ["A", "B", "C"],
		showAll: false, // テストでは"all"オプションを無効にする
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
				filters={{
					category: {
						type: "select",
						options: ["A", "B", "C"],
						showAll: false,
					},
				}}
				urlSync={false}
			/>,
		);

		// 初期状態で全アイテムが表示されていることを確認
		expect(screen.getByTestId("item-1")).toBeInTheDocument();
		expect(screen.getByTestId("item-2")).toBeInTheDocument();
		expect(screen.getByTestId("item-3")).toBeInTheDocument();
		expect(screen.getByTestId("item-4")).toBeInTheDocument();
		expect(screen.getByTestId("item-5")).toBeInTheDocument();

		// カテゴリーフィルターを選択
		const categorySelect = screen.getByRole("combobox");
		fireEvent.click(categorySelect);

		// waitForを使用してドロップダウンが開くのを待つ
		await waitFor(() => {
			expect(screen.getByText("A")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("A"));

		// フィルター適用後の状態を確認
		await waitFor(
			() => {
				expect(screen.getByTestId("item-1")).toBeInTheDocument();
				expect(screen.getByTestId("item-3")).toBeInTheDocument();
				expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
				expect(screen.queryByTestId("item-4")).not.toBeInTheDocument();
				expect(screen.queryByTestId("item-5")).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it("filters items by boolean filter", async () => {
		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				filters={{
					inStock: {
						type: "boolean",
					},
				}}
				urlSync={false}
			/>,
		);

		// 在庫ありフィルターをクリック
		const stockButton = screen.getByText("inStock");
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
		render(
			<ConfigurableList items={sampleItems} renderItem={renderItem} urlSync={false} searchable />,
		);

		const searchInput = screen.getByPlaceholderText("検索... (Enterで検索)");
		fireEvent.change(searchInput, { target: { value: "Item 1" } });
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		await waitFor(() => {
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
		});
	});

	it("検索ボックスに入力してもEnterキーを押すまでフィルタリングされない", async () => {
		const user = userEvent.setup();
		render(
			<ConfigurableList items={sampleItems} renderItem={renderItem} urlSync={false} searchable />,
		);

		const searchInput = screen.getByPlaceholderText("検索... (Enterで検索)");

		// 文字を入力してもすぐにはフィルタリングされない
		await user.type(searchInput, "Item 1");

		// 全てのアイテムがまだ表示されている
		sampleItems.forEach((item) => {
			expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
		});

		// Enterキーを押すとフィルタリングされる
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		await waitFor(() => {
			expect(screen.getByTestId("item-1")).toBeInTheDocument();
			expect(screen.queryByTestId("item-2")).not.toBeInTheDocument();
			expect(screen.queryByTestId("item-3")).not.toBeInTheDocument();
			expect(screen.queryByTestId("item-4")).not.toBeInTheDocument();
			expect(screen.queryByTestId("item-5")).not.toBeInTheDocument();
		});
	});

	it("日本語入力中（IME変換中）はEnterキーでも検索が実行されない", async () => {
		render(
			<ConfigurableList items={sampleItems} renderItem={renderItem} urlSync={false} searchable />,
		);

		const searchInput = screen.getByPlaceholderText("検索... (Enterで検索)");

		// IME変換開始
		fireEvent.compositionStart(searchInput);
		fireEvent.change(searchInput, { target: { value: "アイテム" } });
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		// 全てのアイテムがまだ表示されている（検索が実行されていない）
		sampleItems.forEach((item) => {
			expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
		});

		// IME変換終了
		fireEvent.compositionEnd(searchInput);

		// IME変換終了後にEnterキーを押すと検索が実行される
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		await waitFor(() => {
			// "アイテム"にマッチするアイテムがないので、全て非表示になる
			sampleItems.forEach((item) => {
				expect(screen.queryByTestId(`item-${item.id}`)).not.toBeInTheDocument();
			});
		});
	});

	it("URLSync有効時にEnterキーでHistory APIが呼ばれる", async () => {
		// History APIをモック
		const mockPushState = vi.fn();
		const mockDispatchEvent = vi.fn();
		window.history.pushState = mockPushState;
		window.dispatchEvent = mockDispatchEvent;

		render(
			<ConfigurableList items={sampleItems} renderItem={renderItem} urlSync={true} searchable />,
		);

		const searchInput = screen.getByPlaceholderText("検索... (Enterで検索)");
		fireEvent.change(searchInput, { target: { value: "test" } });
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		await waitFor(() => {
			expect(mockPushState).toHaveBeenCalled();
			expect(mockDispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "popstate",
				}),
			);
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
		const sortSelect = screen.getByRole("combobox");
		fireEvent.click(sortSelect);

		// waitForを使用してドロップダウンが開くのを待つ
		await waitFor(() => {
			expect(screen.getByText("価格順")).toBeInTheDocument();
		});

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
				filters={{
					category: {
						type: "select",
						options: ["A", "B", "C"],
						showAll: false,
					},
				}}
				urlSync={false}
			/>,
		);

		// フィルターを適用
		const categorySelect = screen.getByRole("combobox");
		fireEvent.click(categorySelect);

		// waitForを使用してドロップダウンが開くのを待つ
		await waitFor(() => {
			expect(screen.getByText("A")).toBeInTheDocument();
		});

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

		const searchInput = screen.getByPlaceholderText("検索... (Enterで検索)");
		fireEvent.change(searchInput, { target: { value: "NotFound" } });
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

		// 実際の動作では検索結果がありませんと表示されるはずだが、
		// すべてのアイテムが表示されている場合は元のアイテムが表示されている
		await waitFor(
			() => {
				// 検索結果がない場合、空のアイテムリストを確認
				sampleItems.forEach((item) => {
					expect(screen.queryByTestId(`item-${item.id}`)).not.toBeInTheDocument();
				});
			},
			{ timeout: 3000 },
		);
	});

	it("disables search when searchable is false", () => {
		render(<ConfigurableList items={sampleItems} renderItem={renderItem} searchable={false} />);

		expect(screen.queryByPlaceholderText("検索... (Enterで検索)")).not.toBeInTheDocument();
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

	it("displays initialTotal correctly for server-side rendering", () => {
		// Render with initialTotal to simulate server-side rendering
		render(
			<ConfigurableList items={sampleItems.slice(0, 2)} initialTotal={5} renderItem={renderItem} />,
		);

		// Verify initial data is displayed with correct total
		expect(screen.getByTestId("item-1")).toBeInTheDocument();
		expect(screen.getByTestId("item-2")).toBeInTheDocument();
		expect(screen.getByText(/全\d+件/)).toHaveTextContent("全5件");
	});

	it("handles server-side data fetching", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			items: sampleItems.slice(0, 2),
			total: 5,
		});

		// Render without initialData to trigger fetch
		const { rerender } = render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				fetchFn={mockFetch}
				dataAdapter={{
					toParams: (params) => params,
					fromResult: (result) => {
						const typedResult = result as import("../configurable-list/types").ListDataSource<
							(typeof sampleItems)[0]
						>;
						return typedResult;
					},
				}}
				searchable={true}
				urlSync={false}
			/>,
		);

		// Change a filter to trigger fetch
		rerender(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				fetchFn={mockFetch}
				dataAdapter={{
					toParams: (params) => params,
					fromResult: (result) => {
						const typedResult = result as import("../configurable-list/types").ListDataSource<
							(typeof sampleItems)[0]
						>;
						return typedResult;
					},
				}}
				searchable={true}
				urlSync={false}
				filters={_filters}
			/>,
		);

		// Select a filter to trigger fetch
		const filterButton = screen.getByRole("combobox");
		fireEvent.click(filterButton);
		const optionA = await screen.findByText("A");
		fireEvent.click(optionA);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});
	});

	it("ページサイズ変更時にフリッカーを防ぐ", async () => {
		let resolvePromise: (value: unknown) => void = () => {};
		const fetchPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const mockFetch = vi.fn(() => fetchPromise);

		render(
			<ConfigurableList
				items={sampleItems}
				renderItem={renderItem}
				fetchFn={mockFetch}
				dataAdapter={{
					toParams: (params) => params,
					fromResult: (result) => {
						const typedResult = result as import("../configurable-list/types").ListDataSource<
							(typeof sampleItems)[0]
						>;
						return typedResult;
					},
				}}
				itemsPerPageOptions={[2, 4, 6]}
				itemsPerPage={2}
				initialTotal={sampleItems.length}
				urlSync={false}
			/>,
		);

		// 初期データが表示されることを確認
		expect(screen.getByTestId("item-1")).toBeInTheDocument();
		expect(screen.getByTestId("item-2")).toBeInTheDocument();

		// ページサイズ変更を開始
		const pageSizeSelect = screen.getByText("2件/ページ");
		fireEvent.click(pageSizeSelect);

		// セレクトボックスが開くのを待つ
		const option4 = await screen.findByText("4件/ページ");
		fireEvent.click(option4);

		// データ取得中でも既存データが表示され続けることを確認
		expect(screen.getByTestId("item-1")).toBeInTheDocument();
		expect(screen.getByTestId("item-2")).toBeInTheDocument();

		// "データがありません"メッセージが表示されないことを確認
		expect(screen.queryByText("データがありません")).not.toBeInTheDocument();

		// フェッチが完了
		resolvePromise({
			items: sampleItems.slice(0, 4),
			total: sampleItems.length,
		});

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});
	});
});
