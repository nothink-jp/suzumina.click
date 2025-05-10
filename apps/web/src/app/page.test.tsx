import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page"; // page.tsx をインポート

// 非同期サーバーコンポーネントのテストのため、必要なモックを設定

// VideoList コンポーネントをモック
vi.mock("@/components/videos/VideoList", () => ({
  default: ({
    limit,
    showViewAllLink,
  }: { limit?: number; showViewAllLink?: boolean }) => (
    <div data-testid="mock-video-list">
      <h2 className="text-2xl font-bold mb-6">最新動画</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
      {showViewAllLink && (
        <div className="mt-8 flex justify-end">
          <a href="/videos" className="btn btn-primary">
            もっと見る
          </a>
        </div>
      )}
    </div>
  ),
}));

// Hero コンポーネントをモック
vi.mock("@/components/ui/Hero", () => ({
  default: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="mock-hero">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}));

// UserStatusCard コンポーネントをモック
vi.mock("@/components/ui/UserStatusCard", () => ({
  default: ({ user }: { user: any }) => (
    <div data-testid="mock-user-status-card">
      {user ? (
        <div>
          <p>ログイン中です</p>
          <p>ユーザー名: {user.displayName || "未設定"}</p>
        </div>
      ) : (
        <p>未ログイン</p>
      )}
    </div>
  ),
}));

// getProfile 関数をモック - パスを修正
vi.mock("@/actions/profile/getProfile", () => ({
  getProfile: vi.fn().mockResolvedValue(null), // デフォルトでは非ログイン状態
}));

describe("ホームページ", () => {
  it("Heroコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    const hero = screen.getByTestId("mock-hero");
    expect(hero).toBeInTheDocument();
    expect(hero.querySelector("h1")?.textContent).toBe("すずみなくりっく！");
  });

  it("VideoListコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証 - モック化されたVideoListコンポーネントを検索
    const videoList = screen.getByTestId("mock-video-list");
    expect(videoList).toBeInTheDocument();
  });

  it("UserStatusCardコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    const userStatusCard = screen.getByTestId("mock-user-status-card");
    expect(userStatusCard).toBeInTheDocument();
  });

  it("非ログイン時には未ログインの表示がされること", async () => {
    // 準備 - 非ログイン状態のモックを設定
    const { getProfile } = await import("@/actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue(null);

    // 実行
    render(await HomePage());

    // 検証
    expect(screen.getByText("未ログイン")).toBeInTheDocument();
  });

  it("ログイン時にはユーザー情報が表示されること", async () => {
    // 準備 - ログイン状態のモックを設定
    const { getProfile } = await import("@/actions/profile/getProfile");
    vi.mocked(getProfile).mockResolvedValue({
      uid: "test-uid",
      displayName: "テストユーザー",
      preferredName: "テストユーザー",
      photoURL: "https://example.com/avatar.jpg",
      bio: "テスト用ユーザープロフィール",
      isPublic: true,
      createdAt: new Date("2025-04-01T00:00:00.000Z"),
      updatedAt: new Date("2025-04-20T00:00:00.000Z"),
    });

    // 実行
    render(await HomePage());

    // 検証
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();
    expect(screen.getByText(/ユーザー名: テストユーザー/)).toBeInTheDocument();
  });
});
