import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListHeader } from "../list-header";

describe("ListHeader", () => {
	it("基本的なタイトルと件数が表示される", () => {
		render(<ListHeader title="テスト一覧" totalCount={150} />);

		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全150件)")).toBeInTheDocument();
	});

	it("フィルタ適用時に正しい形式で表示される", () => {
		render(<ListHeader title="動画一覧" totalCount={500} filteredCount={25} />);

		expect(screen.getByText("動画一覧")).toBeInTheDocument();
		expect(screen.getByText("(25件 / 全500件)")).toBeInTheDocument();
	});

	it("フィルタ件数が総件数と同じ場合は通常表示", () => {
		render(<ListHeader title="作品一覧" totalCount={100} filteredCount={100} />);

		expect(screen.getByText("作品一覧")).toBeInTheDocument();
		expect(screen.getByText("(全100件)")).toBeInTheDocument();
	});

	it("ページ情報が表示される", () => {
		render(<ListHeader title="テスト一覧" totalCount={200} currentPage={3} totalPages={10} />);

		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全200件)")).toBeInTheDocument();
		expect(screen.getByText("3ページ / 10ページ")).toBeInTheDocument();
	});

	it("ページが1ページのみの場合はページ情報が表示されない", () => {
		render(<ListHeader title="テスト一覧" totalCount={10} currentPage={1} totalPages={1} />);

		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全10件)")).toBeInTheDocument();
		expect(screen.queryByText("1ページ / 1ページ")).not.toBeInTheDocument();
	});

	it("アクションボタンが表示される", () => {
		const actionButton = <button type="button">新規作成</button>;

		render(<ListHeader title="テスト一覧" totalCount={50} actions={actionButton} />);

		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全50件)")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
	});

	it("数値のカンマ区切りが正しく表示される", () => {
		render(<ListHeader title="大量データ一覧" totalCount={123456} filteredCount={7890} />);

		expect(screen.getByText("大量データ一覧")).toBeInTheDocument();
		expect(screen.getByText("(7,890件 / 全123,456件)")).toBeInTheDocument();
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(
			<ListHeader title="テスト一覧" totalCount={10} className="custom-class" />,
		);

		expect(container.firstChild).toHaveClass("custom-class");
	});

	it("フィルタ適用時のみフィルタ表示ロジックが正しく動作する", () => {
		// filteredCount が undefined の場合
		const { rerender } = render(<ListHeader title="テスト一覧" totalCount={100} />);
		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全100件)")).toBeInTheDocument();

		// filteredCount が totalCount と異なる場合
		rerender(<ListHeader title="テスト一覧" totalCount={100} filteredCount={50} />);
		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(50件 / 全100件)")).toBeInTheDocument();

		// filteredCount が totalCount と同じ場合
		rerender(<ListHeader title="テスト一覧" totalCount={100} filteredCount={100} />);
		expect(screen.getByText("テスト一覧")).toBeInTheDocument();
		expect(screen.getByText("(全100件)")).toBeInTheDocument();
	});

	it("0件の場合でも正しく表示される", () => {
		render(<ListHeader title="空の一覧" totalCount={0} />);

		expect(screen.getByText("空の一覧")).toBeInTheDocument();
		expect(screen.getByText("(全0件)")).toBeInTheDocument();
	});

	it("フィルタで0件の場合でも正しく表示される", () => {
		render(<ListHeader title="一覧" totalCount={100} filteredCount={0} />);

		expect(screen.getByText("一覧")).toBeInTheDocument();
		expect(screen.getByText("(0件 / 全100件)")).toBeInTheDocument();
	});

	it("全てのプロパティが指定された場合の複合表示", () => {
		const actionButton = <button type="button">操作</button>;

		render(
			<ListHeader
				title="完全テスト"
				totalCount={1000}
				filteredCount={150}
				currentPage={5}
				totalPages={20}
				actions={actionButton}
				className="test-class"
			/>,
		);

		expect(screen.getByText("完全テスト")).toBeInTheDocument();
		expect(screen.getByText("(150件 / 全1,000件)")).toBeInTheDocument();
		expect(screen.getByText("5ページ / 20ページ")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "操作" })).toBeInTheDocument();
	});

	it("複数のアクションボタンが表示される", () => {
		const multipleActions = (
			<div>
				<button type="button">作成</button>
				<button type="button">削除</button>
			</div>
		);

		render(<ListHeader title="テスト" totalCount={50} actions={multipleActions} />);

		expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
	});

	it("currentPageのみ指定してもページ情報は表示されない", () => {
		render(<ListHeader title="テスト" totalCount={50} currentPage={2} />);

		expect(screen.queryByText(/ページ/)).not.toBeInTheDocument();
	});

	it("totalPagesのみ指定してもページ情報は表示されない", () => {
		render(<ListHeader title="テスト" totalCount={50} totalPages={5} />);

		expect(screen.queryByText(/ページ/)).not.toBeInTheDocument();
	});

	it("ページ数が0の場合はページ情報が表示されない", () => {
		render(<ListHeader title="テスト" totalCount={0} currentPage={1} totalPages={0} />);

		expect(screen.queryByText(/ページ/)).not.toBeInTheDocument();
	});

	it("大きな数値のカンマ区切りが正しく動作する", () => {
		render(<ListHeader title="大規模テスト" totalCount={9876543} filteredCount={1234567} />);

		expect(screen.getByText("(1,234,567件 / 全9,876,543件)")).toBeInTheDocument();
	});

	it("レスポンシブクラスが正しく適用されている", () => {
		const { container } = render(<ListHeader title="テスト" totalCount={10} />);

		const headerDiv = container.firstChild as HTMLElement;
		expect(headerDiv).toHaveClass("flex");
		expect(headerDiv).toHaveClass("flex-col");
		expect(headerDiv).toHaveClass("sm:flex-row");
		expect(headerDiv).toHaveClass("sm:justify-between");
	});
});
