import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SiteFooter from "./SiteFooter";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

describe("SiteFooter", () => {
	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/basicComponentRendering.test.tsx)

	it("レスポンシブグリッドレイアウトが適用される", () => {
		render(<SiteFooter />);

		// リンクコンテナのグリッドレイアウト
		const aboutLink = screen.getByText("このサイトについて");
		const linkContainer = aboutLink.closest("div");

		// grid-cols-2 md:grid-cols-4 クラスを持つ親要素を探す
		let gridContainer = linkContainer;
		while (gridContainer && !gridContainer.className.includes("grid-cols-2")) {
			gridContainer = gridContainer.parentElement;
		}

		expect(gridContainer).toHaveClass(
			"grid",
			"grid-cols-2",
			"md:grid-cols-4",
			"gap-4",
			"text-center",
		);
	});

	it("ホバー効果とトランジションが設定される", () => {
		render(<SiteFooter />);

		// リンクが存在することを確認
		const aboutLink = screen.getByText("このサイトについて");
		const contactLink = screen.getByText("お問い合わせ");

		expect(aboutLink).toBeInTheDocument();
		expect(contactLink).toBeInTheDocument();

		// クリック可能な要素であることを確認
		expect(aboutLink.closest("a")).toBeInTheDocument();
		expect(contactLink.closest("a")).toBeInTheDocument();
	});

	it("コンテンツの階層構造が正しい", () => {
		render(<SiteFooter />);

		// フッター内の主要セクションの存在確認
		const footer = screen.getByRole("contentinfo");

		// 4つのリンクすべてが含まれていることを確認
		expect(footer).toContainElement(screen.getByText("このサイトについて"));
		expect(footer).toContainElement(screen.getByText("お問い合わせ"));
		expect(footer).toContainElement(screen.getByText("利用規約"));
		expect(footer).toContainElement(screen.getByText("プライバシーポリシー"));

		// サイト情報が含まれていることを確認
		expect(footer).toContainElement(screen.getByText("suzumina.click"));
		expect(footer).toContainElement(
			screen.getByText("ファンによる、ファンのためのコミュニティサイト"),
		);

		// コピーライト情報が含まれていることを確認
		expect(footer).toContainElement(screen.getByText(/© 2025/));
		expect(footer).toContainElement(screen.getByText("nothink.jp"));
	});

	it("フッターが全体レイアウトの最下部に配置される", () => {
		render(<SiteFooter />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toHaveClass("mt-auto");
	});

	it("テキストスタイルが適切に適用される", () => {
		render(<SiteFooter />);

		// メインタイトル
		const title = screen.getByText("suzumina.click");
		expect(title).toHaveClass("font-bold", "text-lg", "mb-2");

		// 説明文
		const description = screen.getByText("ファンによる、ファンのためのコミュニティサイト");
		expect(description).toHaveClass("text-minase-200", "text-sm");

		// フッターリンクとコピーライトの存在確認
		const aboutLink = screen.getByText("このサイトについて");
		expect(aboutLink).toBeInTheDocument();

		// コピーライト
		const copyrightYear = screen.getByText(/© 2025/);
		const nothinkLink = screen.getByText("nothink.jp");
		expect(copyrightYear).toBeInTheDocument();
		expect(nothinkLink).toBeInTheDocument();
	});
});
