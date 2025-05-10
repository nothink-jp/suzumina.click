import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideosPage from "./page";

// Reactのモック
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    // Suspenseをモックして、childrenを直接レンダリングするように
    Suspense: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// next/navigationのモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// VideoList コンポーネントをモック
vi.mock("@/components/videos/VideoList", () => ({
  default: ({ defaultVideoType }: { defaultVideoType: string }) => (
    <div data-testid="mock-video-list" data-video-type={defaultVideoType}>
      <h2 className="text-2xl font-bold mb-6">モック動画リスト</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    </div>
  ),
}));

describe("動画一覧ページ", () => {
  it("ページタイトルが表示されること", () => {
    // 準備 & 実行
    render(<VideosPage />);

    // 検証
    const heading = screen.getByText("動画一覧");
    expect(heading).toBeInTheDocument();

    // テキスト内容を実際の出力に合わせて修正
    const description = screen.getByText(
      "涼花みなせさんの動画を一覧表示しています",
    );
    expect(description).toBeInTheDocument();
  });

  it("VideoListコンポーネントが表示されること", () => {
    // 準備 & 実行
    render(<VideosPage />);

    // 検証
    const videoList = screen.getByTestId("mock-video-list");
    expect(videoList).toBeInTheDocument();
    // デフォルトのビデオタイプが "all" であることを確認
    expect(videoList).toHaveAttribute("data-video-type", "all");
  });
});
