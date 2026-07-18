import type { UserSession } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MobileMenu from "../mobile-menu";

// Next.js Linkコンポーネントのモック
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// AuthButtonのモック（認証UIの詳細は auth-button 側のテストで担保）
vi.mock("../../user/auth-button", () => ({
	default: ({ user }: { user?: UserSession | null }) => (
		<div data-testid="auth-button">{user ? "ログイン中" : "ログイン"}</div>
	),
}));

const mockUser: UserSession = {
	discordId: "123456789",
	username: "testuser",
	displayName: "テストユーザー",
	avatar: "avatar-hash",
	guildMembership: {
		guildId: "test-guild",
		userId: "123456789",
		isMember: true,
	},
	isActive: true,
};

/** SheetTrigger をクリックしてメニューを開く（Radix Sheet は開くまで中身を描画しない） */
async function openMenu() {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "メニューを開く" }));
}

/** リンクテキストと href の対応を検証する */
function expectLink(name: RegExp, href: string) {
	expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
}

describe("MobileMenu", () => {
	describe("未ログイン時", () => {
		it("公開リンクのみ表示され、ログイン時セクションは表示されない", async () => {
			render(<MobileMenu user={null} />);
			await openMenu();

			// 公開リンク
			expectLink(/動画一覧/, "/videos");
			expectLink(/ボタン検索/, "/buttons");
			expectLink(/作品一覧/, "/works");

			// ログイン時セクションは非表示
			expect(screen.queryByRole("link", { name: /お気に入り/ })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /マイページ/ })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /配信中マーキング/ })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /設定/ })).not.toBeInTheDocument();

			// 認証ボタンは常設
			expect(screen.getByTestId("auth-button")).toHaveTextContent("ログイン");
		});
	});

	describe("ログイン時", () => {
		it("公開リンクに加えてログイン時セクションの各リンクが正しい href で表示される", async () => {
			render(<MobileMenu user={mockUser} />);
			await openMenu();

			// 公開リンク
			expectLink(/動画一覧/, "/videos");
			expectLink(/ボタン検索/, "/buttons");
			expectLink(/作品一覧/, "/works");

			// ログイン時セクション（/live は配信終了後も下書き仕上げに戻れる常設導線）
			expectLink(/お気に入り/, "/favorites");
			expectLink(/マイページ/, "/users/me");
			expectLink(/配信中マーキング/, "/live");
			expectLink(/設定/, "/settings");

			expect(screen.getByTestId("auth-button")).toHaveTextContent("ログイン中");
		});
	});

	describe("Sheet の遅延描画", () => {
		it("トリガーを開くまでメニューの中身は描画されない", () => {
			render(<MobileMenu user={mockUser} />);

			expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
			expect(screen.queryByRole("link", { name: /動画一覧/ })).not.toBeInTheDocument();
		});
	});
});
