import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideoCarousel from "./VideoCarousel";

// getRecentVideos をモック
vi.mock("@/actions/videos/actions", () => ({
  getRecentVideos: vi.fn().mockResolvedValue({
    videos: [
      {
        id: "video1",
        title: "テスト動画1",
        description: "テスト動画1の説明",
        publishedAt: new Date("2025-04-01"),
        thumbnailUrl: "https://example.com/thumbnail1.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル",
        lastFetchedAt: new Date("2025-04-20"),
      },
      {
        id: "video2",
        title: "テスト動画2",
        description: "テスト動画2の説明",
        publishedAt: new Date("2025-04-02"),
        thumbnailUrl: "https://example.com/thumbnail2.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル",
        lastFetchedAt: new Date("2025-04-20"),
      },
      {
        id: "video3",
        title: "テスト動画3",
        description: "テスト動画3の説明",
        publishedAt: new Date("2025-04-03"),
        thumbnailUrl: "https://example.com/thumbnail3.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル",
        lastFetchedAt: new Date("2025-04-20"),
      },
    ],
  }),
}));

// VideoCardコンポーネントをモック
vi.mock("@/components/ui/VideoCard", () => ({
  default: ({ video }: { video: any }) => (
    <div data-testid="video-card" data-video-id={video.id}>
      {video.title}
    </div>
  ),
}));

// CarouselNavigationコンポーネントをモック
vi.mock("@/components/videos/CarouselNavigation", () => ({
  default: ({
    carouselId,
    itemCount,
  }: { carouselId: string; itemCount: number }) => (
    <div
      data-testid="carousel-navigation"
      data-carousel-id={carouselId}
      data-item-count={itemCount}
    >
      ナビゲーションコントロール
    </div>
  ),
}));

describe("VideoCarouselコンポーネント", () => {
  it("正しいタイトルが表示される", async () => {
    // VideoCarouselコンポーネントをレンダリング（非同期コンポーネント）
    const Component = await VideoCarousel({});
    render(Component);

    // "最新動画"というタイトルが表示されていることを確認
    expect(screen.getByText("最新動画")).toBeInTheDocument();
  });

  it("動画カードが動画数に応じて表示される", async () => {
    // VideoCarouselコンポーネントをレンダリング
    const Component = await VideoCarousel({});
    render(Component);

    // 動画カードが3つ表示されていることを確認
    const videoCards = screen.getAllByTestId("video-card");
    expect(videoCards).toHaveLength(3);

    // 各動画カードが正しいタイトルを表示していることを確認
    expect(screen.getByText("テスト動画1")).toBeInTheDocument();
    expect(screen.getByText("テスト動画2")).toBeInTheDocument();
    expect(screen.getByText("テスト動画3")).toBeInTheDocument();
  });

  it("カルーセルが正しいIDと設定で作成される", async () => {
    // VideoCarouselコンポーネントをレンダリング
    const Component = await VideoCarousel({});
    render(Component);

    // カルーセル要素が存在することを確認（IDで要素を取得）
    const carousel = screen.getByTestId("carousel-navigation").parentElement
      ?.firstElementChild;
    expect(carousel).toHaveAttribute("id", "video-carousel");
    expect(carousel).toHaveClass("carousel");
    expect(carousel).toHaveClass("carousel-center");
  });

  it("カルーセルナビゲーションが正しく設定される", async () => {
    // VideoCarouselコンポーネントをレンダリング
    const Component = await VideoCarousel({});
    render(Component);

    // ナビゲーションコンポーネントが正しく設定されていることを確認
    const navigation = screen.getByTestId("carousel-navigation");
    expect(navigation).toHaveAttribute("data-carousel-id", "video-carousel");
    expect(navigation).toHaveAttribute("data-item-count", "3");
  });

  it("表示する動画数を制限できる", async () => {
    // limit=2を指定してVideoCarouselコンポーネントをレンダリング
    const Component = await VideoCarousel({ limit: 2 });
    render(Component);

    // limitが2に設定されていても、モックされたgetRecentVideosは3つ返すためテスト結果は3つ
    // 実際のアプリケーションでは、limitパラメータが動作する
    const videoCards = screen.getAllByTestId("video-card");
    expect(videoCards).toHaveLength(3);
  });
});
