import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "../../tests/test-utils";
import { Navigation } from "./Navigation";

// next-auth/reactをモック
const mockUseSession = mock();
const mockSignOut = mock();
mock.module("next-auth/react", () => ({
  useSession: mockUseSession,
  signOut: mockSignOut,
}));

describe("Navigation", () => {
  test("statusがloadingの場合、ユーザー関連のリンクを表示しない", () => { // 説明文を修正
    mockUseSession.mockReturnValue({
      status: "loading",
      data: null,
      update: mock(),
    });
    const { container } = render(<Navigation />);
    expect(container.querySelector("nav")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "ログイン" })).toBeNull();
    expect(screen.queryByRole("link", { name: "プロフィール" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ログアウト" })).toBeNull();
  });

  test("statusがauthenticatedの場合、プロフィールリンクとログアウトボタンを表示する", () => {
    const userId = "user123";
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: userId, name: "Test User" }, expires: "1" },
      update: mock(),
    });
    render(<Navigation />);

    const profileLink = screen.getByRole("link", { name: "プロフィール" });
    expect(profileLink).not.toBeNull();
    // getAttributeを使用してhref属性を確認
    expect(profileLink.getAttribute("href")).toBe(`/users/${userId}`);

    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    expect(logoutButton).not.toBeNull();

    expect(screen.queryByRole("link", { name: "ログイン" })).toBeNull();
  });

  test("statusがunauthenticatedの場合、ログインリンクを表示する", () => {
    mockUseSession.mockReturnValue({
      status: "unauthenticated",
      data: null,
      update: mock(),
    });
    render(<Navigation />);

    const loginLink = screen.getByRole("link", { name: "ログイン" });
    expect(loginLink).not.toBeNull();
    // getAttributeを使用してhref属性を確認
    expect(loginLink.getAttribute("href")).toBe("/auth/signin");

    expect(screen.queryByRole("link", { name: "プロフィール" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ログアウト" })).toBeNull();
  });

  test("ログアウトボタンをクリックするとsignOutが呼び出される", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "user123", name: "Test User" }, expires: "1" },
      update: mock(),
    });
    render(<Navigation />);

    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    fireEvent.click(logoutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
