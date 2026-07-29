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

// ナビ「マーク N」バッジの件数フック（count() 集約はテスト対象外なので固定値）
vi.mock("@/hooks/use-draft-count", () => ({
	useDraftCount: (enabled: boolean) => (enabled ? 7 : null),
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
			expect(screen.queryByRole("link", { name: /マーク/ })).not.toBeInTheDocument();
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

			// ログイン時セクション（ナビが指すのは棚 /drafts。件数バッジが再訪の理由）
			expectLink(/お気に入り/, "/favorites");
			expectLink(/マイページ/, "/users/me");
			expectLink(/マーク/, "/drafts");
			expectLink(/設定/, "/settings");
			expect(screen.getByRole("link", { name: /マーク/ })).toHaveTextContent("7");

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
