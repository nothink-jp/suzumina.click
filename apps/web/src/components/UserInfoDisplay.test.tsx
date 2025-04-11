import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { render } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { UserInfoDisplay } from "./UserInfoDisplay";

// useSessionのモック
let mockSession: {
  data: { user: Record<string, unknown> } | null;
  status: "loading" | "authenticated" | "unauthenticated";
} = {
  data: null,
  status: "unauthenticated",
};

mock.module("next-auth/react", () => ({
  useSession: () => mockSession,
}));

describe("UserInfoDisplay", () => {
  // 各テストの前にモックをリセット
  beforeEach(() => {
    mockSession = {
      data: null,
      status: "unauthenticated",
    };
  });

  it("ローディング中は何も表示しない", () => {
    mockSession.status = "loading";
    const { container } = render(<UserInfoDisplay />);
    expect(container.innerHTML).toBe("");
  });

  it("未認証の場合は何も表示しない", () => {
    mockSession.status = "unauthenticated";
    const { container } = render(<UserInfoDisplay />);
    expect(container.innerHTML).toBe("");
  });

  it("認証済みの場合はユーザー情報を表示", () => {
    const mockUser = {
      id: "test-user",
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
      role: "member",
    };

    mockSession = {
      data: { user: mockUser },
      status: "authenticated",
    };

    const { container } = render(<UserInfoDisplay />);
    
    // 見出しの確認
    expect(container.innerHTML).toContain("ログイン情報 (Client Side)");

    // ユーザー情報の表示確認
    expect(container.innerHTML).toContain(mockUser.name);
    expect(container.innerHTML).toContain(mockUser.email);
  });

  it("セッション内のユーザー情報が不完全でも表示", () => {
    const partialUser = {
      id: "test-user",
      // name と email が欠けている
      role: "member",
    };

    mockSession = {
      data: { user: partialUser },
      status: "authenticated",
    };

    const { container } = render(<UserInfoDisplay />);

    // 見出しの確認
    expect(container.innerHTML).toContain("ログイン情報 (Client Side)");

    // 不完全なユーザー情報でもJSON形式で表示される
    expect(container.innerHTML).toContain(partialUser.id);
    expect(container.innerHTML).toContain(partialUser.role);
  });
});