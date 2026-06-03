import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesktopNav } from "../desktop-nav";

// next/link を素の <a> に置換（DesktopNav の唯一の外部依存）
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

describe("DesktopNav（実コンポーネント）", () => {
	it("3つのナビリンクを正しい href で描画する", () => {
		render(<DesktopNav />);

		const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
		const links = screen.getAllByRole("link");

		// SPR-124 の回帰（先頭リンク欠落）を検出: 3リンク・順序・href を固定で検証
		expect(links).toHaveLength(3);
		expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
			["動画一覧", "/videos"],
			["ボタン検索", "/buttons"],
			["作品一覧", "/works"],
		]);
		// 先頭の動画一覧が nav 内に存在すること（SPR-124 で消えた項目）
		expect(nav).toContainElement(screen.getByRole("link", { name: "動画一覧" }));
	});
});
