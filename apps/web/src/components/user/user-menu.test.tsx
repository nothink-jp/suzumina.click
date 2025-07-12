import type { UserSession } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UserMenu from "./user-menu";

// UserAvatarコンポーネントのモック
vi.mock("./user-avatar", () => ({
	default: ({ displayName, className }: { displayName: string; className: string }) => (
		<div data-testid="user-avatar" className={className}>
			{displayName}
		</div>
	),
}));

// Server Actionsのモック
vi.mock("@/app/auth/actions", () => ({
	signOutAction: vi.fn(),
}));

// Next.js Linkコンポーネントのモック
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

describe("UserMenu", () => {
	const mockUser: UserSession = {
		discordId: "123456789",
		username: "testuser",
		displayName: "テストユーザー",
		avatar: "avatar-hash",
		role: "member",
		guildMembership: {
			guildId: "test-guild",
			userId: "123456789",
			isMember: true,
		},
		isActive: true,
	};

	it("ユーザー情報を正しく表示する", () => {
		render(<UserMenu user={mockUser} />);

		// トリガーボタンにユーザー名が表示されている（複数の要素に同じテキストがあるためAllByを使用）
		const userNameElements = screen.getAllByText("テストユーザー");
		expect(userNameElements.length).toBeGreaterThan(0);
		expect(screen.getByText("メンバー")).toBeInTheDocument();
		expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
	});

	it("管理者ロールが正しく表示される", () => {
		const adminUser = { ...mockUser, role: "admin" as const };
		render(<UserMenu user={adminUser} />);

		expect(screen.getByText("管理者")).toBeInTheDocument();
	});

	it("モデレーターロールが正しく表示される", () => {
		const moderatorUser = { ...mockUser, role: "moderator" as const };
		render(<UserMenu user={moderatorUser} />);

		expect(screen.getByText("モデレーター")).toBeInTheDocument();
	});

	it("ドロップダウンメニューを開くことができる", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		// トリガーボタンをクリック
		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		// メニュー項目が表示される（テキストで検索）
		expect(screen.getByText("マイページ")).toBeInTheDocument();
		expect(screen.getByText("ログアウト")).toBeInTheDocument();
	});

	it("マイページリンクが正しく設定されている", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		// メニューを開く
		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		// マイページリンクを確認
		const myPageLink = screen.getByRole("link", { name: /マイページ/i });
		expect(myPageLink).toHaveAttribute("href", "/users/me");
	});

	it("ログアウトボタンがサブミットボタンとして正しく設定されている", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		// メニューを開く
		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		// ログアウトボタンを確認
		const logoutButton = screen.getByRole("button", { name: /ログアウト/i });
		expect(logoutButton).toHaveAttribute("type", "submit");
	});

	it("アクセシビリティ属性が正しく設定されている", () => {
		render(<UserMenu user={mockUser} />);

		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		expect(triggerButton).toHaveAttribute("aria-label", "ユーザーメニューを開く");
	});
});
