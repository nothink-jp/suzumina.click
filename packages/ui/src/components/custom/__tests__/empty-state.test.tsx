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

	it("illustrated=true では IconStack にアイコンが乗る", () => {
		const icon = <div data-testid="empty-icon">📭</div>;
		const { container } = render(
			<EmptyState icon={icon} title="お気に入りがありません" illustrated />,
		);

		expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
		expect(container.querySelector('[data-slot="icon-stack"]')).toBeInTheDocument();
	});

	it("illustrated=false（既定）では IconStack を使わない", () => {
		const icon = <div data-testid="empty-icon">📭</div>;
		const { container } = render(<EmptyState icon={icon} title="データがありません" />);

		expect(container.querySelector('[data-slot="icon-stack"]')).not.toBeInTheDocument();
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

	it("icon が無ければ何もレンダリングしない", () => {
		const { container } = render(<EmptyState title="テスト" />);

		expect(container.querySelector('[data-slot="icon-stack"]')).not.toBeInTheDocument();
	});
});
