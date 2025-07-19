import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	ListPageContent,
	ListPageEmptyState,
	ListPageGrid,
	ListPageHeader,
	ListPageLayout,
	ListPageStats,
} from "./list-page-layout";

describe("ListPageLayout", () => {
	it("基本的なレイアウトが正しく表示される", () => {
		render(
			<ListPageLayout>
				<div>テストコンテンツ</div>
			</ListPageLayout>,
		);

		expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(
			<ListPageLayout className="custom-layout">
				<div>テストコンテンツ</div>
			</ListPageLayout>,
		);

		expect(container.firstChild).toHaveClass("custom-layout");
		expect(container.firstChild).toHaveClass("min-h-screen");
		expect(container.firstChild).toHaveClass("bg-background");
	});
});

describe("ListPageHeader", () => {
	it("タイトルと説明が表示される", () => {
		render(<ListPageHeader title="テストページ" description="テストページの説明文です" />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("テストページ");
		expect(screen.getByText("テストページの説明文です")).toBeInTheDocument();
	});

	it("説明なしでも正常に表示される", () => {
		render(<ListPageHeader title="タイトルのみ" />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("タイトルのみ");
	});

	it("子要素（アクションボタンなど）が表示される", () => {
		render(
			<ListPageHeader title="テストページ">
				<button type="button">新規作成</button>
			</ListPageHeader>,
		);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("テストページ");
		expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
	});
});

describe("ListPageContent", () => {
	it("コンテンツが正しく表示される", () => {
		render(
			<ListPageContent>
				<div>メインコンテンツ</div>
			</ListPageContent>,
		);

		expect(screen.getByText("メインコンテンツ")).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(
			<ListPageContent className="custom-content">
				<div>テスト</div>
			</ListPageContent>,
		);

		expect(container.firstChild).toHaveClass("custom-content");
	});
});

describe("ListPageGrid", () => {
	it("グリッドアイテムが正しく表示される", () => {
		render(
			<ListPageGrid>
				<div>アイテム1</div>
				<div>アイテム2</div>
				<div>アイテム3</div>
			</ListPageGrid>,
		);

		expect(screen.getByText("アイテム1")).toBeInTheDocument();
		expect(screen.getByText("アイテム2")).toBeInTheDocument();
		expect(screen.getByText("アイテム3")).toBeInTheDocument();
	});

	it("デフォルトのカラム設定が適用される", () => {
		const { container } = render(
			<ListPageGrid>
				<div>テスト</div>
			</ListPageGrid>,
		);

		expect(container.firstChild).toHaveClass("grid");
		expect(container.firstChild).toHaveClass("gap-6");
	});

	it("カスタムカラム設定が適用される", () => {
		const { container } = render(
			<ListPageGrid
				columns={{
					default: 2,
					md: 3,
					lg: 4,
					xl: 6,
				}}
			>
				<div>テスト</div>
			</ListPageGrid>,
		);

		expect(container.firstChild).toHaveClass("grid");
		expect(container.firstChild).toHaveClass("gap-6");
	});
});

describe("ListPageStats", () => {
	it("統計情報が正しく表示される", () => {
		render(<ListPageStats currentPage={2} totalPages={10} totalCount={150} itemsPerPage={15} />);

		expect(screen.getByText("150件中 16〜30件を表示")).toBeInTheDocument();
	});

	it("最初のページの統計が正しく表示される", () => {
		render(<ListPageStats currentPage={1} totalPages={5} totalCount={50} itemsPerPage={10} />);

		expect(screen.getByText("50件中 1〜10件を表示")).toBeInTheDocument();
	});

	it("最後のページの統計が正しく表示される", () => {
		render(<ListPageStats currentPage={3} totalPages={3} totalCount={25} itemsPerPage={10} />);

		expect(screen.getByText("25件中 21〜25件を表示")).toBeInTheDocument();
	});

	it("数値がカンマ区切りで表示される", () => {
		render(
			<ListPageStats currentPage={100} totalPages={200} totalCount={123456} itemsPerPage={1000} />,
		);

		expect(screen.getByText("123,456件中 99,001〜100,000件を表示")).toBeInTheDocument();
	});
});

describe("ListPageEmptyState", () => {
	it("基本的な空状態が表示される", () => {
		render(<ListPageEmptyState title="データがありません" />);

		expect(screen.getByText("データがありません")).toBeInTheDocument();
	});

	it("アイコンと説明が表示される", () => {
		const icon = <div data-testid="empty-icon">📭</div>;

		render(
			<ListPageEmptyState
				icon={icon}
				title="データがありません"
				description="検索条件を変更してください"
			/>,
		);

		expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
		expect(screen.getByText("データがありません")).toBeInTheDocument();
		expect(screen.getByText("検索条件を変更してください")).toBeInTheDocument();
	});

	it("アクションボタンが表示される", () => {
		const action = <button type="button">新規作成</button>;

		render(<ListPageEmptyState title="データがありません" action={action} />);

		expect(screen.getByText("データがありません")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
	});

	it("すべての要素が組み合わせて表示される", () => {
		const icon = <div data-testid="empty-icon">📭</div>;
		const action = <button type="button">データを追加</button>;

		render(
			<ListPageEmptyState
				icon={icon}
				title="まだデータがありません"
				description="最初のデータを作成してみましょう"
				action={action}
			/>,
		);

		expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
		expect(screen.getByText("まだデータがありません")).toBeInTheDocument();
		expect(screen.getByText("最初のデータを作成してみましょう")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "データを追加" })).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(<ListPageEmptyState title="テスト" className="custom-empty" />);

		expect(container.firstChild).toHaveClass("custom-empty");
		expect(container.firstChild).toHaveClass("text-center");
		expect(container.firstChild).toHaveClass("py-12");
	});
});

describe("ListPageGrid エッジケース", () => {
	it("カラム設定がない場合はデフォルト値が使用される", () => {
		const { container } = render(
			<ListPageGrid columns={{}}>
				<div>テスト</div>
			</ListPageGrid>,
		);

		expect(container.firstChild).toHaveClass("grid-cols-1");
	});

	it("部分的なカラム設定が適用される", () => {
		const { container } = render(
			<ListPageGrid
				columns={{
					default: 2,
					lg: 4,
				}}
			>
				<div>テスト</div>
			</ListPageGrid>,
		);

		expect(container.firstChild).toHaveClass("grid");
		expect(container.firstChild).toHaveClass("gap-6");
	});

	it("全画面サイズのカラム設定が適用される", () => {
		const { container } = render(
			<ListPageGrid
				columns={{
					default: 1,
					sm: 2,
					md: 3,
					lg: 4,
					xl: 5,
				}}
			>
				<div>テスト</div>
			</ListPageGrid>,
		);

		expect(container.firstChild).toHaveClass("grid");
	});
});

describe("ListPageStats エッジケース", () => {
	it("1ページ目で1件のみの場合", () => {
		render(<ListPageStats currentPage={1} totalPages={1} totalCount={1} itemsPerPage={10} />);

		expect(screen.getByText("1件中 1〜1件を表示")).toBeInTheDocument();
	});

	it("0件の場合も正しく表示される", () => {
		render(<ListPageStats currentPage={1} totalPages={1} totalCount={0} itemsPerPage={10} />);

		expect(screen.getByText("0件中 1〜0件を表示")).toBeInTheDocument();
	});

	it("最後のページで端数がある場合", () => {
		render(<ListPageStats currentPage={4} totalPages={4} totalCount={35} itemsPerPage={10} />);

		expect(screen.getByText("35件中 31〜35件を表示")).toBeInTheDocument();
	});

	it("大きな数値でのページネーション計算", () => {
		render(
			<ListPageStats currentPage={500} totalPages={1000} totalCount={50000} itemsPerPage={50} />,
		);

		expect(screen.getByText("50,000件中 24,951〜25,000件を表示")).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(
			<ListPageStats
				currentPage={1}
				totalPages={1}
				totalCount={10}
				itemsPerPage={10}
				className="custom-stats"
			/>,
		);

		expect(container.firstChild).toHaveClass("custom-stats");
		expect(container.firstChild).toHaveClass("mt-6");
		expect(container.firstChild).toHaveClass("text-sm");
	});
});

describe("ListPageHeader エッジケース", () => {
	it("長いタイトルと説明でも正しくレイアウトされる", () => {
		render(
			<ListPageHeader
				title="非常に長いタイトルの場合のテストケースです"
				description="これは非常に長い説明文で、レスポンシブデザインが正しく機能するかをテストしています。"
			/>,
		);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"非常に長いタイトルの場合のテストケースです",
		);
		expect(
			screen.getByText(
				"これは非常に長い説明文で、レスポンシブデザインが正しく機能するかをテストしています。",
			),
		).toBeInTheDocument();
	});

	it("複数のアクションボタンが配置される", () => {
		render(
			<ListPageHeader title="テスト">
				<button type="button">作成</button>
				<button type="button">インポート</button>
				<button type="button">設定</button>
			</ListPageHeader>,
		);

		expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "インポート" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(<ListPageHeader title="テスト" className="custom-header" />);

		const headerElement = container.querySelector("header");
		expect(headerElement).toHaveClass("custom-header");
		expect(headerElement).toHaveClass("bg-white");
		expect(headerElement).toHaveClass("shadow-sm");
	});
});

describe("統合テスト：複合レイアウト", () => {
	it("全コンポーネントが組み合わせて正しく動作する", () => {
		render(
			<ListPageLayout className="test-layout">
				<ListPageHeader title="テスト統合ページ" description="全コンポーネントのテスト">
					<button type="button">アクション</button>
				</ListPageHeader>
				<ListPageContent>
					<ListPageGrid>
						<div>アイテム1</div>
						<div>アイテム2</div>
					</ListPageGrid>
					<ListPageStats currentPage={2} totalPages={5} totalCount={100} itemsPerPage={20} />
					<ListPageEmptyState
						title="データなし"
						description="テスト用の空状態"
						action={<button type="button">作成</button>}
					/>
				</ListPageContent>
			</ListPageLayout>,
		);

		// 各コンポーネントの要素が正しく表示されることを確認
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("テスト統合ページ");
		expect(screen.getByText("全コンポーネントのテスト")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "アクション" })).toBeInTheDocument();
		expect(screen.getByText("アイテム1")).toBeInTheDocument();
		expect(screen.getByText("アイテム2")).toBeInTheDocument();
		expect(screen.getByText("100件中 21〜40件を表示")).toBeInTheDocument();
		expect(screen.getByText("データなし")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
	});
});
