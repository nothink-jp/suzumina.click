import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { UserActions } from "./UserActions";

// next-auth/reactのモック
mock.module("next-auth/react", () => ({
  signOut: mock(() => Promise.resolve()),
}));

describe("UserActions", () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    mock.restore();
  });

  it("ローディング中は何も表示しない", () => {
    const { container } = render(<UserActions status="loading" />);
    expect(container.innerHTML).toBe("");
  });

  it("未認証状態ではログインリンクを表示", () => {
    const { container } = render(<UserActions status="unauthenticated" />);

    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/auth/signin");
    expect(link?.textContent).toContain("ログイン");
  });

  it("認証済み状態でユーザーIDがある場合はログアウトボタンを表示", () => {
    const { container } = render(
      <UserActions status="authenticated" userId="test-user" />,
    );

    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain("ログアウト");
  });

  it("ログアウトボタンをクリックするとsignOut関数が呼ばれる", () => {
    const mockSignOut = mock(() => Promise.resolve());
    mock.module("next-auth/react", () => ({
      signOut: mockSignOut,
    }));

    const { container } = render(
      <UserActions status="authenticated" userId="test-user" />,
    );

    const button = container.querySelector("button");
    expect(button).toBeTruthy();

    if (button) {
      fireEvent.click(button);
      expect(mockSignOut).toHaveBeenCalled();
    }
  });

  it("認証済み状態でもユーザーIDがない場合はログアウトボタンを表示しない", () => {
    const { container } = render(<UserActions status="authenticated" />);

    const button = container.querySelector("button");
    expect(button).toBeFalsy();

    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain("ログイン");
  });
});
