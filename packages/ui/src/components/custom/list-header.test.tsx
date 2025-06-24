import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListHeader } from "./list-header";

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
});
