import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UserStatusCard from "./UserStatusCard";

// テスト用のモックユーザーデータ
const mockUser = {
  uid: "test-uid",
  displayName: "テストユーザー",
  email: "test@example.com",
  emailVerified: true,
  phoneNumber: null,
  photoURL: "https://example.com/avatar.jpg",
  disabled: false,
  metadata: {
    creationTime: "2025-04-01T00:00:00.000Z",
    lastSignInTime: "2025-04-28T00:00:00.000Z",
    toJSON: () => ({
      creationTime: "2025-04-01T00:00:00.000Z",
      lastSignInTime: "2025-04-28T00:00:00.000Z",
    }),
  },
  providerData: [],
  toJSON: () => ({
    uid: "test-uid",
    displayName: "テストユーザー",
    email: "test@example.com",
  }),
};

describe("UserStatusCardコンポーネント", () => {
  it("ログイン状態で正しく表示されること", () => {
    // 準備
    render(<UserStatusCard user={mockUser} />);

    // 検証
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();

    // テキストを含む要素を取得するためにテキスト関数を使用
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === "ユーザー名: テストユーザー";
      }),
    ).toBeInTheDocument();

    // プロフィールへのリンクが存在すること
    const profileLink = screen.getByRole("link", { name: "プロフィール" });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("ユーザー画像がある場合に表示されること", () => {
    // 準備
    render(<UserStatusCard user={mockUser} />);

    // 検証
    const avatar = screen.getByRole("img");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", mockUser.photoURL);
    expect(avatar).toHaveAttribute("alt", `${mockUser.displayName}のアバター`);
  });

  it("表示名がない場合に「未設定」と表示されること", () => {
    // 準備 - 表示名なしのユーザー
    const userWithoutName = {
      ...mockUser,
      displayName: null,
    };

    render(<UserStatusCard user={userWithoutName} />);

    // 検証 - 複数要素に分かれたテキストを検索
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === "ユーザー名: 未設定";
      }),
    ).toBeInTheDocument();
  });

  it("非ログイン状態で正しく表示されること", () => {
    // 準備
    render(<UserStatusCard user={null} />);

    // 検証
    expect(screen.getByText("ログインしていません")).toBeInTheDocument();
    expect(
      screen.getByText("機能をすべて利用するにはログインしてください"),
    ).toBeInTheDocument();

    // ログインへのリンクが存在すること
    const loginLink = screen.getByRole("link", { name: "ログイン" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/auth");
  });
});
