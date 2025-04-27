import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideosPage from "./page";

// VideoList コンポーネントをモック
vi.mock("../_components/VideoList", () => ({
  default: () => (
    <div data-testid="mock-video-list">
      <h2 className="text-2xl font-bold mb-6">最新動画</h2>
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
    
    const description = screen.getByText("涼花みなせさんの動画をすべて一覧表示しています");
    expect(description).toBeInTheDocument();
  });

  it("VideoListコンポーネントが表示されること", () => {
    // 準備 & 実行
    render(<VideosPage />);

    // 検証
    const videoList = screen.getByTestId("mock-video-list");
    expect(videoList).toBeInTheDocument();
  });
});