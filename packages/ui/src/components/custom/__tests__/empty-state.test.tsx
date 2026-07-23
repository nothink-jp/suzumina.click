import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
	it("基本的な空状態が表示される", () => {
		render(<EmptyState title="データがありません" />);

		expect(screen.getByText("データがありません")).toBeInTheDocument();
	});

	it("アイコンと説明が表示される", () => {
		const icon = <div data-testid="empty-icon">📭</div>;

		render(
			<EmptyState
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

		render(<EmptyState title="データがありません" action={action} />);

		expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
	});

	it('titleAs 既定（"p"）では title が <p> タグで描画される', () => {
		render(<EmptyState title="データがありません" />);

		const title = screen.getByText("データがありません");
		expect(title.tagName).toBe("P");
	});

	it('titleAs="h3" では title が見出しとして描画される（AIレビュー指摘: 見出し階層の後退防止）', () => {
		render(<EmptyState title="音声ボタンがありません" titleAs="h3" />);

		expect(
			screen.getByRole("heading", { level: 3, name: "音声ボタンがありません" }),
		).toBeInTheDocument();
	});

	it('size="sm" でコンパクトな余白・文字サイズになる', () => {
		const { container } = render(<EmptyState title="テスト" size="sm" />);

		expect(container.firstChild).toHaveClass("py-6");
		expect(screen.getByText("テスト")).toHaveClass("text-sm");
	});

	it("カスタムクラスが適用される", () => {
		const { container } = render(<EmptyState title="テスト" className="custom-empty" />);

		expect(container.firstChild).toHaveClass("custom-empty");
		expect(container.firstChild).toHaveClass("text-center");
		expect(container.firstChild).toHaveClass("py-12");
	});

	it("icon が無ければアイコン用の要素を描画しない", () => {
		const { container } = render(<EmptyState title="テスト" />);

		expect(container.querySelectorAll("div").length).toBe(1);
	});
});
