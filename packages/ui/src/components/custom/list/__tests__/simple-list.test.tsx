import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleList } from "../simple-list";

// テスト用のサンプルデータ
const sampleItems = [
	{ id: 1, title: "First Item", createdAt: "2024-01-01" },
	{ id: 2, title: "Second Item", createdAt: "2024-01-02" },
	{ id: 3, title: "Third Item", createdAt: "2024-01-03" },
	{ id: 4, title: "Fourth Item", createdAt: "2024-01-04" },
	{ id: 5, title: "Fifth Item", createdAt: "2024-01-05" },
];

const renderItem = (item: (typeof sampleItems)[0]) => (
	<div data-testid={`item-${item.id}`}>{item.title}</div>
);

describe("SimpleList", () => {
	it("renders items correctly", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} />);

		sampleItems.forEach((item) => {
			expect(screen.getByText(item.title)).toBeInTheDocument();
		});
	});

	it("shows loading state when loading prop is true", () => {
		render(<SimpleList items={[]} renderItem={renderItem} loading={true} />);

		expect(screen.getByText("読み込み中...")).toBeInTheDocument();
	});

	it("shows error state when error prop is provided", () => {
		const error = {
			type: "fetch" as const,
			message: "エラーが発生しました",
			retry: vi.fn(),
		};

		render(<SimpleList items={[]} renderItem={renderItem} error={error} />);

		expect(screen.getByText(error.message)).toBeInTheDocument();
		expect(screen.getByText("再試行")).toBeInTheDocument();
	});

	it("filters items based on search term", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} />);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "First" } });

		expect(screen.getByText("First Item")).toBeInTheDocument();
		expect(screen.queryByText("Second Item")).not.toBeInTheDocument();
	});

	it("paginates items correctly", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} itemsPerPage={2} />);

		// デフォルトは新しい順なので、最初のページには最後の2アイテムが表示される
		expect(screen.getByText("Fifth Item")).toBeInTheDocument();
		expect(screen.getByText("Fourth Item")).toBeInTheDocument();
		expect(screen.queryByText("Third Item")).not.toBeInTheDocument();

		// ページ番号を確認
		expect(screen.getByText("5件中 1-2件を表示")).toBeInTheDocument();
	});

	it("changes sort order when sort select is changed", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} />);

		// デフォルトは新しい順（降順）
		const firstItem = screen.getAllByTestId(/^item-/)[0];
		expect(firstItem).toHaveAttribute("data-testid", "item-5");

		// 古い順に変更
		const sortSelect = screen.getByRole("combobox");
		fireEvent.click(sortSelect);
		fireEvent.click(screen.getByText("古い順"));

		// 順序が変わることを確認
		const firstItemAfterSort = screen.getAllByTestId(/^item-/)[0];
		expect(firstItemAfterSort).toHaveAttribute("data-testid", "item-1");
	});

	it("navigates between pages", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} itemsPerPage={2} />);

		// 2ページ目へ移動
		const page2Button = screen.getByRole("button", { name: "2" });
		fireEvent.click(page2Button);

		// デフォルトは新しい順なので、2ページ目には3番目と2番目のアイテムが表示される
		expect(screen.queryByText("Fifth Item")).not.toBeInTheDocument();
		expect(screen.getByText("Third Item")).toBeInTheDocument();
		expect(screen.getByText("Second Item")).toBeInTheDocument();
	});

	it("shows empty message when no items", () => {
		render(<SimpleList items={[]} renderItem={renderItem} />);

		expect(screen.getByText("データがありません")).toBeInTheDocument();
	});

	it("shows no results message when search returns empty", () => {
		render(<SimpleList items={sampleItems} renderItem={renderItem} />);

		const searchInput = screen.getByPlaceholderText("検索...");
		fireEvent.change(searchInput, { target: { value: "NotFound" } });

		expect(screen.getByText("検索結果がありません")).toBeInTheDocument();
	});
});
