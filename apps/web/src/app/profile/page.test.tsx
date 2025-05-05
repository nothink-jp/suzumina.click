import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// モジュールのモックを先に設定
vi.mock("../actions/profile/getProfile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/components/ui/AuthButton", () => ({
  default: () => <button type="button">ログイン</button>,
}));

vi.mock("./_components/ProfileEditForm", () => ({
  default: ({ profile }) => (
    <div>プロフィール編集フォーム（{profile.preferredName}）</div>
  ),
}));

// React の Suspense をモック
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    Suspense: ({ children }) => children,
  };
});

import { getProfile } from "../actions/profile/getProfile";
import ProfilePage from "./page";

// テスト開始
describe("プロフィールページ", () => {
  // モックプロフィールデータ
  const mockProfileData = {
    uid: "test-user-123",
    displayName: "テストユーザー@1234",
    preferredName: "テストユーザー",
    photoURL: "https://example.com/photo.jpg",
    bio: "これはテスト用のプロフィールです。",
    isPublic: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-04-01T00:00:00Z",
  };

  // テスト前の準備
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みユーザーのプロフィールが正しく表示されること", async () => {
    // プロフィール取得関数のモック設定
    (getProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProfileData,
    );

    // コンポーネントをレンダリング（サーバーコンポーネントのため await が必要）
    const page = await ProfilePage();
    render(page);

    // プロフィール情報が表示されることを確認
    expect(screen.getByText("テストユーザー")).toBeInTheDocument();
    expect(screen.getByText("自己紹介")).toBeInTheDocument();
    expect(
      screen.getByText("これはテスト用のプロフィールです。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("プロフィール編集フォーム（テストユーザー）"),
    ).toBeInTheDocument();

    // アカウント情報の確認
    expect(screen.getByText(/認証プロバイダー: Discord/)).toBeInTheDocument();
    expect(screen.getByText(/認証日時:/)).toBeInTheDocument();
    expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
  });

  it("未ログイン状態の場合はログインを促すメッセージが表示されること", async () => {
    // 未ログイン状態をシミュレート
    (getProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // コンポーネントをレンダリング
    const page = await ProfilePage();
    render(page);

    // ログインを促すメッセージが表示されることを確認
    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
    expect(
      screen.getByText("プロフィール情報を表示するにはログインしてください。"),
    ).toBeInTheDocument();
    expect(screen.getByText("ログイン")).toBeInTheDocument();
  });
});
