import { render, screen } from "@testing-library/react";
import { UserMetadata } from "firebase-admin/auth";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page"; // page.tsx をインポート

// 非同期サーバーコンポーネントのテストのため、必要なモックを設定

// VideoList コンポーネントをモック
vi.mock("./_components/VideoList", () => ({
  default: ({ limit, showViewAllLink }: { limit?: number; showViewAllLink?: boolean }) => (
    <div data-testid="mock-video-list">
      <h2 className="text-2xl font-bold mb-6">最新動画</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
      {showViewAllLink && (
        <div className="mt-8 flex justify-end">
          <a href="/videos" className="btn btn-primary">もっと見る</a>
        </div>
      )}
    </div>
  ),
}));

// AuthButton コンポーネントをモック
vi.mock("@/components/ui/AuthButton", () => ({
  default: () => <button type="button" data-testid="mock-auth-button">ログイン</button>,
}));

// getCurrentUser 関数をモック
vi.mock("./api/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null), // デフォルトでは非ログイン状態
}));

describe("ホームページ", () => {
  it("メインの見出しが表示されること", async () => {
    // 準備 & 実行
    const { container } = render(await HomePage());

    // 検証 - h1タグを直接検索
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("すずみなくりっく！");
  });

  it("VideoListコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証 - モック化されたVideoListコンポーネントを検索
    const videoList = screen.getByTestId("mock-video-list");
    expect(videoList).toBeInTheDocument();
    
    // 見出しが表示されていることを確認
    const heading = screen.getByText("最新動画");
    expect(heading).toBeInTheDocument();
  });

  it("非ログイン時にはAuthButtonが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    const authButton = screen.getByTestId("mock-auth-button");
    expect(authButton).toBeInTheDocument();
  });

  it("ログイン時にはユーザー情報が表示されること", async () => {
    // 準備 - ログイン状態のモックを設定
    const { getCurrentUser } = await import("./api/auth/getCurrentUser");
    vi.mocked(getCurrentUser).mockResolvedValue({
      uid: "test-uid",
      displayName: "テストユーザー",
      email: "test@example.com",
      emailVerified: false,
      disabled: false,
      metadata: {
        creationTime: "2025-04-01T00:00:00.000Z",
        lastSignInTime: "2025-04-20T00:00:00.000Z",
        toJSON: () => ({
          creationTime: "2025-04-01T00:00:00.000Z",
          lastSignInTime: "2025-04-20T00:00:00.000Z",
        }),
      },
      providerData: [],
      toJSON: (): object => ({
        uid: "test-uid",
        displayName: "テストユーザー",
        email: "test@example.com",
      }),
    });

    // 実行
    render(await HomePage());

    // 検証
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();
    expect(screen.getByText(/ユーザー名: テストユーザー/)).toBeInTheDocument();
  });
});
