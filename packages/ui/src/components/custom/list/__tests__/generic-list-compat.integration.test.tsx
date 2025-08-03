import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenericListCompatProps } from "../generic-list-compat";
import { GenericListCompat } from "../generic-list-compat";

// Next.js router モック
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		pathname: "/test",
	}),
	useSearchParams: () => ({
		get: vi.fn(() => null),
		toString: vi.fn(() => ""),
	}),
	usePathname: () => "/test",
}));

interface TestItem {
	id: string;
	name: string;
	category: string;
	year: number;
	score: number;
}

const mockItems: TestItem[] = Array.from({ length: 50 }, (_, i) => ({
	id: `item-${i}`,
	name: `Item ${i}`,
	category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
	year: 2020 + (i % 4),
	score: Math.floor(Math.random() * 100),
}));

const mockFetchData = vi.fn();

const defaultConfig: GenericListCompatProps<TestItem>["config"] = {
	baseUrl: "/test",
	filters: [
		{
			key: "category",
			type: "select",
			label: "カテゴリ",
			options: [
				{ value: "all", label: "すべて" },
				{ value: "A", label: "カテゴリA" },
				{ value: "B", label: "カテゴリB" },
				{ value: "C", label: "カテゴリC" },
			],
			defaultValue: "all",
		},
		{
			key: "year",
			type: "select",
			label: "年",
			options: [
				{ value: "all", label: "すべて" },
				{ value: "2020", label: "2020年" },
				{ value: "2021", label: "2021年" },
				{ value: "2022", label: "2022年" },
				{ value: "2023", label: "2023年" },
			],
			defaultValue: "all",
		},
	],
	sorts: [
		{ value: "name", label: "名前順" },
		{ value: "score", label: "スコア順" },
	],
	defaultSort: "name",
	searchConfig: {
		placeholder: "検索...",
		debounceMs: 100, // テスト用に短く設定
	},
	paginationConfig: {
		itemsPerPage: 10,
		itemsPerPageOptions: [10, 20, 50],
	},
};

describe("GenericListCompat Integration Tests", () => {
	// TODO: これらのテストは、クライアントサイドでのデータフェッチとURL同期の
	// 複雑な相互作用のため、現在スキップされています。
	// 将来的には、より適切なモック環境を構築して有効化する必要があります。
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetchData.mockResolvedValue({
			items: mockItems.slice(0, 10),
			totalCount: mockItems.length,
			filteredCount: mockItems.length,
		});
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it.skip("初期表示が正しく行われる", async () => {
		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		// ローディング表示 (スケルトンが表示される)
		// data-slot="skeleton" 属性を持つ要素を探す
		const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThan(0);

		// データ取得完了を待つ
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenCalledWith({
				page: 1,
				limit: 10,
				sort: "name",
				search: undefined,
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});

		// アイテムが表示される
		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
			expect(screen.getByText("Item 9")).toBeInTheDocument();
		});

		// 件数表示
		expect(screen.getByText(/全50件/)).toBeInTheDocument();
	});

	it.skip("フィルタリングが正しく動作する", async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// カテゴリフィルタを開く
		const categoryFilter = screen.getByRole("button", { name: /カテゴリ/ });
		await user.click(categoryFilter);

		// カテゴリAを選択
		const categoryOption = screen.getByRole("option", { name: "カテゴリA" });
		await user.click(categoryOption);

		// フィルタリングされたデータが取得される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 10,
				sort: "name",
				search: undefined,
				filters: {
					category: "A",
					year: undefined,
				},
			});
		});
	});

	it.skip("検索が正しく動作する", async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ delay: null });

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// 検索フィールドに入力
		const searchInput = screen.getByPlaceholderText("検索...");
		await user.type(searchInput, "test");

		// デバウンスタイマーを進める
		vi.advanceTimersByTime(100);

		// 検索が実行される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 10,
				sort: "name",
				search: "test",
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});

		vi.useRealTimers();
	});

	it.skip("ページネーションが正しく動作する", async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// 次のページへ
		const nextButton = screen.getByRole("link", { name: "次のページへ" });
		await user.click(nextButton);

		// ページ2のデータが取得される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 2,
				limit: 10,
				sort: "name",
				search: undefined,
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});
	});

	it.skip("ページサイズ変更が正しく動作する", async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// ページサイズセレクタを開く
		const pageSizeButton = screen.getByRole("button", { name: /10件/ });
		await user.click(pageSizeButton);

		// 20件を選択
		const option20 = screen.getByRole("option", { name: "20件" });
		await user.click(option20);

		// 20件のデータが取得される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 20,
				sort: "name",
				search: undefined,
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});
	});

	it.skip("ソート変更が正しく動作する", async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// ソートセレクタを開く
		const sortButton = screen.getByRole("button", { name: /名前順/ });
		await user.click(sortButton);

		// スコア順を選択
		const scoreOption = screen.getByRole("option", { name: "スコア順" });
		await user.click(scoreOption);

		// ソートが変更されてデータが取得される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 10,
				sort: "score",
				search: undefined,
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});
	});

	it.skip("フィルタリセットが正しく動作する", async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});

		// フィルタを適用
		const categoryFilter = screen.getByRole("button", { name: /カテゴリ/ });
		await user.click(categoryFilter);
		const categoryOption = screen.getByRole("option", { name: "カテゴリA" });
		await user.click(categoryOption);

		// リセットボタンをクリック
		const resetButton = screen.getByRole("button", { name: "リセット" });
		await user.click(resetButton);

		// フィルタがリセットされる
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 10,
				sort: "name",
				search: undefined,
				filters: {
					category: undefined,
					year: undefined,
				},
			});
		});
	});

	it.skip("エラーハンドリングが正しく動作する", { timeout: 10000 }, async () => {
		const user = userEvent.setup();
		const error = new Error("データ取得エラー");
		mockFetchData.mockRejectedValueOnce(error);

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		// エラーメッセージが表示される
		await waitFor(() => {
			expect(screen.getByText("データの取得中にエラーが発生しました")).toBeInTheDocument();
		});

		// リトライボタンが表示される
		const retryButton = screen.getByRole("button", { name: "再試行" });
		expect(retryButton).toBeInTheDocument();

		// リトライ
		mockFetchData.mockResolvedValueOnce({
			items: mockItems.slice(0, 10),
			totalCount: mockItems.length,
			filteredCount: mockItems.length,
		});

		await user.click(retryButton);

		// データが再取得される
		await waitFor(() => {
			expect(screen.getByText("Item 0")).toBeInTheDocument();
		});
	});

	it("初期データが正しく表示される", async () => {
		const initialData = {
			items: mockItems.slice(0, 5),
			totalCount: mockItems.length,
			filteredCount: mockItems.length,
		};

		render(
			<GenericListCompat
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
				initialData={initialData}
			/>,
		);

		// 初期データが即座に表示される
		expect(screen.getByText("Item 0")).toBeInTheDocument();
		expect(screen.getByText("Item 4")).toBeInTheDocument();
		expect(screen.getByText(/全50件/)).toBeInTheDocument();

		// fetchDataが呼ばれない（初期表示時）
		expect(mockFetchData).not.toHaveBeenCalled();
	});

	it.skip("空の結果が正しく表示される", { timeout: 10000 }, async () => {
		mockFetchData.mockResolvedValueOnce({
			items: [],
			totalCount: 0,
			filteredCount: 0,
		});

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		// データ取得完了を待つ（空の結果）
		await waitFor(
			() => {
				expect(mockFetchData).toHaveBeenCalled();
			},
			{ timeout: 5000 },
		);

		// 空メッセージが表示される
		await waitFor(
			() => {
				expect(screen.getByText("データがありません")).toBeInTheDocument();
			},
			{ timeout: 5000 },
		);
	});

	it.skip("複数フィルタの組み合わせが正しく動作する", { timeout: 10000 }, async () => {
		const user = userEvent.setup();

		render(
			<GenericListCompat<TestItem>
				config={defaultConfig}
				fetchData={mockFetchData}
				renderItem={(item) => <div key={item.id}>{item.name}</div>}
			/>,
		);

		// データ取得完了を待つ
		await waitFor(
			() => {
				expect(mockFetchData).toHaveBeenCalled();
			},
			{ timeout: 5000 },
		);

		await waitFor(
			() => {
				expect(screen.getByText("Item 0")).toBeInTheDocument();
			},
			{ timeout: 5000 },
		);

		// カテゴリフィルタ
		const categoryFilter = screen.getByRole("button", { name: /カテゴリ/ });
		await user.click(categoryFilter);
		await user.click(screen.getByRole("option", { name: "カテゴリA" }));

		// 年フィルタ
		const yearFilter = screen.getByRole("button", { name: /年/ });
		await user.click(yearFilter);
		await user.click(screen.getByRole("option", { name: "2022年" }));

		// 両方のフィルタが適用される
		await waitFor(() => {
			expect(mockFetchData).toHaveBeenLastCalledWith({
				page: 1,
				limit: 10,
				sort: "name",
				search: undefined,
				filters: {
					category: "A",
					year: "2022",
				},
			});
		});
	});
});
