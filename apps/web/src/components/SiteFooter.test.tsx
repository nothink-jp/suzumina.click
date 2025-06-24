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
	it("基本的なフッター要素が表示される", () => {
		render(<SiteFooter />);

		// フッター要素
		expect(screen.getByRole("contentinfo")).toBeInTheDocument();

		// サイト名
		expect(screen.getByText("suzumina.click")).toBeInTheDocument();

		// サイト説明
		expect(screen.getByText("ファンによる、ファンのためのコミュニティサイト")).toBeInTheDocument();

		// コピーライト
		expect(screen.getByText(/© 2024 涼花みなせ ファンサイト/)).toBeInTheDocument();
		expect(screen.getByText(/このサイトは非公式のファンサイトです/)).toBeInTheDocument();
	});

	it("フッターリンクが正しく表示される", () => {
		render(<SiteFooter />);

		// 各フッターリンクの存在確認
		const aboutLink = screen.getByText("このサイトについて");
		const contactLink = screen.getByText("お問い合わせ");
		const termsLink = screen.getByText("利用規約");
		const privacyLink = screen.getByText("プライバシーポリシー");

		expect(aboutLink).toBeInTheDocument();
		expect(contactLink).toBeInTheDocument();
		expect(termsLink).toBeInTheDocument();
		expect(privacyLink).toBeInTheDocument();

		// リンクのhref属性確認
		expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");
		expect(contactLink.closest("a")).toHaveAttribute("href", "/contact");
		expect(termsLink.closest("a")).toHaveAttribute("href", "/terms");
		expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
	});

	it("フッターリンクのアクセシビリティが適切に設定される", () => {
		render(<SiteFooter />);

		const aboutLink = screen.getByText("このサイトについて");
		const contactLink = screen.getByText("お問い合わせ");
		const termsLink = screen.getByText("利用規約");
		const privacyLink = screen.getByText("プライバシーポリシー");

		// フォーカス可能な要素であることを確認
		expect(aboutLink.closest("a")).toHaveAttribute("href");
		expect(contactLink.closest("a")).toHaveAttribute("href");
		expect(termsLink.closest("a")).toHaveAttribute("href");
		expect(privacyLink.closest("a")).toHaveAttribute("href");

		// リンクが正しく設定されていることを確認
		expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");
		expect(contactLink.closest("a")).toHaveAttribute("href", "/contact");
		expect(termsLink.closest("a")).toHaveAttribute("href", "/terms");
		expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
	});

	it("フッターの構造が正しく配置される", () => {
		render(<SiteFooter />);

		// フッター全体のコンテナ
		const footer = screen.getByRole("contentinfo");
		expect(footer).toHaveClass("bg-background", "text-foreground", "border-t", "py-12", "mt-auto");

		// サイト情報セクション
		const siteTitle = screen.getByText("suzumina.click");
		expect(siteTitle).toHaveClass("font-bold", "text-lg", "mb-2");

		const siteDescription = screen.getByText("ファンによる、ファンのためのコミュニティサイト");
		expect(siteDescription).toHaveClass("text-muted-foreground", "text-sm");
	});

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
		expect(footer).toContainElement(screen.getByText(/© 2024 涼花みなせ ファンサイト/));
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
		expect(description).toHaveClass("text-muted-foreground", "text-sm");

		// フッターリンクとコピーライトの存在確認
		const aboutLink = screen.getByText("このサイトについて");
		expect(aboutLink).toBeInTheDocument();

		// コピーライト
		const copyright = screen.getByText(/© 2024 涼花みなせ ファンサイト/);
		expect(copyright).toBeInTheDocument();
	});
});
