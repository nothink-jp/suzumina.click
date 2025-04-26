import { useAuth } from "@/lib/firebase/AuthProvider";
import { render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

// useAuth モックの作成
vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// AuthButtonのモック
vi.mock("@/components/ui/AuthButton", () => ({
  default: () => <button type="button">モックログインボタン</button>,
}));

describe("Profile Page", () => {
  it("should show loading state", () => {
    // モックの設定
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<ProfilePage />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should show login prompt when not authenticated", () => {
    // モックの設定
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<ProfilePage />);
    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
    expect(
      screen.getByText("プロフィール情報を表示するにはログインしてください。"),
    ).toBeInTheDocument();
    expect(screen.getByText("モックログインボタン")).toBeInTheDocument();
  });

  it("should display user profile when authenticated", () => {
    // モックの設定
    const mockUser = {
      displayName: "Test User",
      photoURL: "https://example.com/avatar.jpg",
      email: "123456789@discord.com",
      emailVerified: false,
      isAnonymous: false,
      metadata: {
        creationTime: "2024-04-21T00:00:00.000Z",
        lastSignInTime: "2024-04-21T01:00:00.000Z",
      },
      providerData: [],
      refreshToken: "dummy-refresh-token",
      tenantId: null,
      delete: vi.fn(),
      getIdToken: vi.fn(),
      getIdTokenResult: vi.fn(),
      reload: vi.fn(),
      toJSON: vi.fn(),
      uid: "dummy-uid",
      phoneNumber: null,
      providerId: "discord.com",
    } as User;

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<ProfilePage />);

    // ヘッダーの確認
    expect(
      screen.getByRole("heading", { name: "プロフィール", level: 1 }),
    ).toBeInTheDocument();

    // ユーザー情報の確認
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Discord ID: 123456789")).toBeInTheDocument();
    expect(screen.getByAltText("Test Userのアバター")).toBeInTheDocument();

    // アカウント情報の確認
    expect(screen.getByText("認証プロバイダー: Discord")).toBeInTheDocument();
    expect(screen.getByText(/認証日時: 2024\/4\/21/)).toBeInTheDocument();
    expect(screen.getByText(/最終ログイン: 2024\/4\/21/)).toBeInTheDocument();
  });

  it("should handle missing optional user data", () => {
    // photoURL や displayName が null の場合のテスト
    const mockUser = {
      displayName: null,
      photoURL: null,
      email: "123456789@discord.com",
      emailVerified: false,
      isAnonymous: false,
      metadata: {
        creationTime: "2024-04-21T00:00:00.000Z",
        lastSignInTime: "2024-04-21T01:00:00.000Z",
      },
      providerData: [],
      refreshToken: "dummy-refresh-token",
      tenantId: null,
      delete: vi.fn(),
      getIdToken: vi.fn(),
      getIdTokenResult: vi.fn(),
      reload: vi.fn(),
      toJSON: vi.fn(),
      uid: "dummy-uid",
      phoneNumber: null,
      providerId: "discord.com",
    } as User;

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<ProfilePage />);

    // 必須情報のみ表示されることを確認
    expect(screen.getByText("Discord ID: 123456789")).toBeInTheDocument();
    expect(screen.getByText("認証プロバイダー: Discord")).toBeInTheDocument();
  });
});
