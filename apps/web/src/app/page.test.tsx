import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page"; // page.tsx をインポート

// 非同期サーバーコンポーネントのテストのため、必要なモックを設定

// VideoCarousel コンポーネントをモック
vi.mock("@/components/videos/VideoCarousel", () => ({
  default: ({ limit }: { limit?: number }) => (
    <div data-testid="mock-video-carousel">
      <h2 className="text-2xl font-bold mb-4">最新動画</h2>
      <div className="carousel carousel-center w-full p-4 space-x-4 bg-base-200 rounded-box">
        <div className="carousel-item">
          <span>モック動画アイテム 1</span>
        </div>
        <div className="carousel-item">
          <span>モック動画アイテム 2</span>
        </div>
      </div>
    </div>
  ),
}));

// Hero コンポーネントをモック
vi.mock("@/components/ui/Hero", () => ({
  default: ({
    title,
    subtitle,
    children,
    alignment,
  }: {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    alignment?: string;
  }) => (
    <div data-testid="mock-hero" className={`text-${alignment}`}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}));

// getRecentVideos アクションをモック
vi.mock("@/actions/videos/actions", () => ({
  getRecentVideos: vi.fn().mockResolvedValue({
    videos: [
      { id: "video1", title: "テスト動画1", thumbnailUrl: "test1.jpg" },
      { id: "video2", title: "テスト動画2", thumbnailUrl: "test2.jpg" },
    ],
    hasMore: false,
  }),
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

  it("VideoCarouselコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証 - モック化されたVideoCarouselコンポーネントを検索
    const carousel = screen.getByTestId("mock-video-carousel");
    expect(carousel).toBeInTheDocument();
    expect(carousel.querySelector("h2")?.textContent).toBe("最新動画");
  });

  it("トップページにはメインコンテンツエリアが含まれること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    // mainタグの検証（containerクラスを持つことを確認）
    const mainContent = document.querySelector("main.container");
    expect(mainContent).toBeInTheDocument();
  });

  it("最新動画セクションが正しく表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    // カルーセルが正しいクラスを持つことを確認
    const carousel = screen.getByTestId("mock-video-carousel");
    expect(carousel).toBeInTheDocument();

    // カルーセル内のモック動画アイテムが表示されていることを確認
    expect(screen.getByText("モック動画アイテム 1")).toBeInTheDocument();
    expect(screen.getByText("モック動画アイテム 2")).toBeInTheDocument();
  });

  it("ヒーローセクションにサブタイトルが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証
    const hero = screen.getByTestId("mock-hero");
    const subtitle = hero.querySelector("p");
    expect(subtitle).toBeInTheDocument();
    expect(subtitle?.textContent).toBe(
      "ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。",
    );
  });
});
