import type { UserSession } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionState } from "@/lib/auth/client";
import { SessionAwareControls } from "../session-aware-controls";

// 認証抽象だけを mock（プロバイダは触らない）。useSessionState は bare auto-mock で vi.fn 化される。
vi.mock("@/lib/auth/client");

// 子は表示責務のみ。ここでは island の分岐ロジック（isPending / user 有無）に絞って検証する。
vi.mock("../../user/auth-button", () => ({
	default: ({ user }: { user?: UserSession | null }) => (
		<div data-testid="auth-button">{user ? user.displayName : "ログイン"}</div>
	),
}));
vi.mock("../mobile-menu", () => ({
	default: ({ user }: { user?: UserSession | null }) => (
		<div data-testid="mobile-menu">{user ? "認証済み" : "未認証"}</div>
	),
}));

const mockUser = { discordId: "123", displayName: "テストユーザー" } as UserSession;

function setSessionState(state: { user: UserSession | null; isPending: boolean }) {
	vi.mocked(useSessionState).mockReturnValue(state);
}

describe("SessionAwareControls", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("セッション解決前（isPending）は何も描画しない（SSR に per-user を出さずちらつきも防ぐ）", () => {
		setSessionState({ user: null, isPending: true });
		const { container } = render(<SessionAwareControls />);
		expect(container).toBeEmptyDOMElement();
	});

	it("未ログイン（解決済み・user=null）はログインボタンと未認証メニューを描画", () => {
		setSessionState({ user: null, isPending: false });
		render(<SessionAwareControls />);
		expect(screen.getByTestId("auth-button")).toHaveTextContent("ログイン");
		expect(screen.getByTestId("mobile-menu")).toHaveTextContent("未認証");
	});

	it("ログイン済みはユーザー情報を子へ渡す", () => {
		setSessionState({ user: mockUser, isPending: false });
		render(<SessionAwareControls />);
		expect(screen.getByTestId("auth-button")).toHaveTextContent("テストユーザー");
		expect(screen.getByTestId("mobile-menu")).toHaveTextContent("認証済み");
	});
});
