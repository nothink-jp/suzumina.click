import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurableList } from "../configurable-list";
import type { FilterConfig } from "../core/types";

// モック関数を定義
const mockPush = vi.fn();
const mockReplace = vi.fn();

// Next.js router モック
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
		pathname: "/test",
	}),
	useSearchParams: () => ({
		get: vi.fn(() => null),
		toString: vi.fn(() => ""),
	}),
	usePathname: () => "/test",
}));

interface TestItem {
	id: number;
	name: string;
	price: number;
	category: string[];
	createdAt: string;
}

const mockItems: TestItem[] = [
	{ id: 1, name: "Item 1", price: 100, category: ["A", "B"], createdAt: "2024-01-01" },
	{ id: 2, name: "Item 2", price: 200, category: ["B", "C"], createdAt: "2024-02-01" },
	{ id: 3, name: "Item 3", price: 300, category: ["A", "C"], createdAt: "2024-03-01" },
	{ id: 4, name: "Item 4", price: 400, category: ["A"], createdAt: "2024-04-01" },
	{ id: 5, name: "Item 5", price: 500, category: ["B"], createdAt: "2024-05-01" },
];

const mockFetchData = vi.fn();

describe("Advanced Filters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetchData.mockResolvedValue({
			items: mockItems,
			total: mockItems.length,
		});
	});

	describe("Multiselect Filter", () => {
		it("複数選択フィルターが正しく表示される", async () => {
			const filters: Record<string, FilterConfig> = {
				category: {
					type: "multiselect",
					label: "カテゴリ",
					options: ["A", "B", "C"],
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			// フィルターボタンが表示される
			expect(screen.getByText("カテゴリ")).toBeInTheDocument();
		});

		it("複数の値を選択できる", async () => {
			const user = userEvent.setup();
			const filters: Record<string, FilterConfig> = {
				category: {
					type: "multiselect",
					label: "カテゴリ",
					options: ["A", "B", "C"],
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			// カテゴリAを選択
			const checkboxA = screen.getByLabelText("A");
			await user.click(checkboxA);

			// カテゴリBも選択
			const checkboxB = screen.getByLabelText("B");
			await user.click(checkboxB);

			// fetchDataが正しいパラメータで呼ばれる
			await waitFor(() => {
				expect(mockFetchData).toHaveBeenLastCalledWith({
					page: 1,
					itemsPerPage: 12,
					sort: undefined,
					search: undefined,
					filters: {
						category: ["A", "B"],
					},
				});
			});
		});
	});

	describe("Range Filter", () => {
		it("範囲フィルターが正しく表示される", async () => {
			const filters: Record<string, FilterConfig> = {
				price: {
					type: "range",
					label: "価格",
					min: 0,
					max: 1000,
					step: 10,
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			expect(screen.getByText("価格")).toBeInTheDocument();
			// 2つの入力フィールドが表示される
			const inputs = screen.getAllByRole("spinbutton");
			expect(inputs).toHaveLength(2);
		});

		it("範囲の値を入力できる", async () => {
			const user = userEvent.setup();
			const filters: Record<string, FilterConfig> = {
				price: {
					type: "range",
					label: "価格",
					min: 0,
					max: 1000,
					step: 10,
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			const [minInput, maxInput] = screen.getAllByRole("spinbutton");

			// 最小値を入力
			await user.clear(minInput);
			await user.type(minInput, "100");

			// 最大値を入力
			await user.clear(maxInput);
			await user.type(maxInput, "300");

			// fetchDataが正しいパラメータで呼ばれる
			await waitFor(() => {
				expect(mockFetchData).toHaveBeenCalledWith(
					expect.objectContaining({
						filters: {
							price: { min: 100, max: 300 },
						},
					}),
				);
			});
		});
	});

	describe("Date Filter", () => {
		it("日付フィルターが正しく表示される", async () => {
			const filters: Record<string, FilterConfig> = {
				createdAt: {
					type: "date",
					label: "作成日",
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			expect(screen.getByText("作成日")).toBeInTheDocument();
			expect(screen.getByLabelText("作成日")).toHaveAttribute("type", "date");
		});

		it("日付を選択できる", async () => {
			const filters: Record<string, FilterConfig> = {
				createdAt: {
					type: "date",
					label: "作成日",
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			const dateInput = screen.getByLabelText("作成日");
			fireEvent.change(dateInput, { target: { value: "2024-03-15" } });

			// fetchDataが正しいパラメータで呼ばれる
			await waitFor(() => {
				expect(mockFetchData).toHaveBeenCalledWith(
					expect.objectContaining({
						filters: {
							createdAt: "2024-03-15",
						},
					}),
				);
			});
		});
	});

	describe("DateRange Filter", () => {
		it("日付範囲フィルターが正しく表示される", async () => {
			const filters: Record<string, FilterConfig> = {
				period: {
					type: "dateRange",
					label: "期間",
					minDate: "2024-01-01",
					maxDate: "2024-12-31",
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			expect(screen.getByText("期間")).toBeInTheDocument();
			// 2つの日付入力フィールドが表示される
			const dateInputs = screen.getAllByRole("textbox") as HTMLInputElement[];
			expect(dateInputs).toHaveLength(2);
		});

		it("日付範囲を選択できる", async () => {
			const filters: Record<string, FilterConfig> = {
				period: {
					type: "dateRange",
					label: "期間",
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			const dateInputs = screen.getAllByRole("textbox") as HTMLInputElement[];

			// 開始日を設定
			fireEvent.change(dateInputs[0], { target: { value: "2024-01-01" } });

			// 終了日を設定
			fireEvent.change(dateInputs[1], { target: { value: "2024-03-31" } });

			// fetchDataが正しいパラメータで呼ばれる
			await waitFor(() => {
				expect(mockFetchData).toHaveBeenCalledWith(
					expect.objectContaining({
						filters: {
							period: { start: "2024-01-01", end: "2024-03-31" },
						},
					}),
				);
			});
		});
	});

	describe("URL Sync", () => {
		it("multiselectフィルターがURLと同期される", async () => {
			mockReplace.mockClear();

			const filters: Record<string, FilterConfig> = {
				category: {
					type: "multiselect",
					label: "カテゴリ",
					options: ["A", "B", "C"],
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			const checkboxA = screen.getByLabelText("A");
			await userEvent.click(checkboxA);

			// URLが更新される
			await waitFor(() => {
				expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("category=A"));
			});
		});

		it("rangeフィルターがURLと同期される", async () => {
			mockReplace.mockClear();

			const filters: Record<string, FilterConfig> = {
				price: {
					type: "range",
					label: "価格",
					min: 0,
					max: 1000,
				},
			};

			render(
				<ConfigurableList
					items={mockItems}
					filters={filters}
					fetchData={mockFetchData}
					renderItem={(item) => <div>{item.name}</div>}
				/>,
			);

			const [minInput] = screen.getAllByRole("spinbutton");
			await userEvent.clear(minInput);
			await userEvent.type(minInput, "100");

			// URLが更新される
			await waitFor(() => {
				expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("price=100-"));
			});
		});
	});
});
