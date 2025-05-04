import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

// AuthButtonのモック
vi.mock("@/components/ui/AuthButton", () => ({
  default: () => <button type="button">モックログインボタン</button>,
}));

// getProfile APIのモック - パスを修正
vi.mock("../actions/profile/getProfile", () => ({
  getProfile: vi.fn().mockResolvedValue(null),
}));

// ProfileEditForm コンポーネントをモック
vi.mock("./_components/ProfileEditForm", () => ({
  default: ({ profile }: { profile: any }) => (
    <div>モックプロフィール編集フォーム</div>
  ),
}));

// Suspenseのモック
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    Suspense: ({
      children,
      fallback,
    }: { children: React.ReactNode; fallback: React.ReactNode }) => (
      <div data-testid="suspense-mock">{fallback}</div>
    ),
  };
});

describe("Profile Page", () => {
  it("ローディング状態が表示されること", async () => {
    // Suspenseのfallbackを表示するためにgetProfileをモック
    const { getProfile } = await import("../actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue({
      uid: "test-uid",
      displayName: "テストユーザー",
      preferredName: "テストユーザー表示名",
      photoURL: "https://example.com/avatar.jpg",
      bio: "テスト用プロフィール",
      isPublic: true,
      createdAt: new Date("2025-04-01T00:00:00.000Z"),
      updatedAt: new Date("2025-04-20T00:00:00.000Z"),
    });

    render(await ProfilePage());

    // Suspenseのモックが正しく動作していることを確認
    const suspenseMock = screen.getByTestId("suspense-mock");
    expect(suspenseMock).toBeInTheDocument();
    // loadingクラスを持つ要素があることを検証
    expect(
      screen.getByTestId("suspense-mock").querySelector(".loading"),
    ).toHaveClass("loading-spinner");
  });

  it("非ログイン状態ではログインが必要であることが表示されること", async () => {
    // 非ログイン状態をモック
    const { getProfile } = await import("../actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue(null);

    render(await ProfilePage());

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
    expect(
      screen.getByText("プロフィール情報を表示するにはログインしてください。"),
    ).toBeInTheDocument();
    expect(screen.getByText("モックログインボタン")).toBeInTheDocument();
  });

  it("ログイン状態ではユーザープロフィールが表示されること", async () => {
    // モックの設定
    const mockProfile = {
      uid: "dummy-uid",
      displayName: "123456789@discord.com",
      preferredName: "Test User",
      photoURL: "https://example.com/avatar.jpg",
      bio: "テスト用プロフィール",
      isPublic: true,
      createdAt: new Date("2024-04-21T00:00:00.000Z"),
      updatedAt: new Date("2024-04-21T01:00:00.000Z"),
    };

    const { getProfile } = await import("../actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue(mockProfile);

    render(await ProfilePage());

    // ヘッダーの確認
    expect(
      screen.getByRole("heading", { name: "プロフィール", level: 1 }),
    ).toBeInTheDocument();

    // ユーザー情報の確認
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Discord表示名: 123456789")).toBeInTheDocument();
    expect(screen.getByAltText("Test Userのアバター")).toBeInTheDocument();

    // アカウント情報の確認
    expect(screen.getByText("認証プロバイダー: Discord")).toBeInTheDocument();
  });

  it("オプションのユーザーデータがない場合も適切に処理されること", async () => {
    // photoURL や displayName が null の場合のテスト
    const mockProfile = {
      uid: "dummy-uid",
      displayName: null,
      preferredName: null,
      photoURL: null,
      bio: null,
      isPublic: false,
      createdAt: new Date("2024-04-21T00:00:00.000Z"),
      updatedAt: new Date("2024-04-21T01:00:00.000Z"),
    };

    const { getProfile } = await import("../actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue(mockProfile);

    render(await ProfilePage());

    // 必須情報のみ表示されることを確認
    expect(screen.getByText("Discord表示名: 未設定")).toBeInTheDocument();
    expect(screen.getByText("認証プロバイダー: Discord")).toBeInTheDocument();
    expect(screen.getByText("非公開")).toBeInTheDocument();
  });
});
