import type { UserSession } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthButton from "../auth-button";

// 現在地は公開ページ想定（ログイン後の戻り先に使われる）
vi.mock("next/navigation", () => ({
	usePathname: () => "/buttons/RJ123",
}));

// server action（bind して form action に渡す）
vi.mock("@/app/auth/actions", () => ({
	signInAction: vi.fn(),
}));

// UserMenu はログイン時のみ描画されることだけ確認したいので軽量モック
vi.mock("../user-menu", () => ({
	default: ({ user }: { user: UserSession }) => (
		<div data-testid="user-menu">{user.displayName}</div>
	),
}));

const mockUser = { discordId: "1", displayName: "テストユーザー" } as UserSession;

describe("AuthButton", () => {
	it("未ログイン時は Discord ログインボタンを表示する", () => {
		render(<AuthButton user={null} />);
		expect(screen.getByRole("button", { name: /Discordログイン/i })).toBeInTheDocument();
	});

	it("ログイン時は UserMenu を表示する", () => {
		render(<AuthButton user={mockUser} />);
		expect(screen.getByTestId("user-menu")).toHaveTextContent("テストユーザー");
	});
});
