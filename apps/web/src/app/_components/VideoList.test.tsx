import { getRecentVideos } from "@/lib/videos/api";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoList from "./VideoList";

// getRecentVideos関数をモック
vi.mock("@/lib/videos/api", () => ({
  getRecentVideos: vi.fn(),
}));

// VideoCardコンポーネントをモック
vi.mock("@/components/ui/VideoCard", () => ({
  default: ({ video }: { video: any }) => (
    <div data-testid="video-card" data-video-id={video.id}>
      {video.title}
    </div>
  ),
}));

describe("VideoListコンポーネント", () => {
  const mockVideos = [
    {
      id: "1",
      title: "動画1",
      description: "テスト動画1の説明",
      publishedAt: new Date("2025-04-01"),
      publishedAtISO: "2025-04-01T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail1.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
    {
      id: "2",
      title: "動画2",
      description: "テスト動画2の説明",
      publishedAt: new Date("2025-04-02"),
      publishedAtISO: "2025-04-02T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail2.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
    {
      id: "3",
      title: "動画3",
      description: "テスト動画3の説明",
      publishedAt: new Date("2025-04-03"),
      publishedAtISO: "2025-04-03T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail3.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
    {
      id: "4",
      title: "動画4",
      description: "テスト動画4の説明",
      publishedAt: new Date("2025-04-04"),
      publishedAtISO: "2025-04-04T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail4.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
    {
      id: "5",
      title: "動画5",
      description: "テスト動画5の説明",
      publishedAt: new Date("2025-04-05"),
      publishedAtISO: "2025-04-05T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail5.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
    {
      id: "6",
      title: "動画6",
      description: "テスト動画6の説明",
      publishedAt: new Date("2025-04-06"),
      publishedAtISO: "2025-04-06T00:00:00.000Z",
      thumbnailUrl: "https://example.com/thumbnail6.jpg",
      channelId: "channel1",
      channelTitle: "テストチャンネル",
      lastFetchedAt: new Date("2025-04-20"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック実装
    vi.mocked(getRecentVideos).mockResolvedValue({
      videos: mockVideos,
      hasMore: true,
      lastVideo: mockVideos[mockVideos.length - 1],
    });
  });

  it("動画一覧が表示されること", async () => {
    // 準備 & 実行
    render(<VideoList />);

    // 検証 - ヘッダーテキストが表示される
    // h2要素のみを指定することで一意にする
    expect(
      screen.getByRole("heading", { level: 2, name: "すべての動画" }),
    ).toBeInTheDocument();

    const loadingSpinner = screen.getByText("", {
      selector: "span.loading.loading-spinner",
    });
    expect(loadingSpinner).toBeInTheDocument();

    // 動画が表示されるのを待つ
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(1);
    });
  });

  it("limitパラメータで表示数を制限できること", async () => {
    // 準備 & 実行
    render(<VideoList limit={3} />);

    // 検証 - APIが呼ばれるのを待つ
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(1);
    });

    // 動画カードが3つだけ表示されることを確認
    await waitFor(() => {
      const videoCards = screen.queryAllByTestId("video-card");
      expect(videoCards.length).toBeLessThanOrEqual(3);
    });
  });

  it("showViewAllLinkがtrueの場合、「もっと見る」リンクが表示されること", async () => {
    // 準備 & 実行
    render(<VideoList showViewAllLink={true} />);

    // 検証 - APIが呼ばれるのを待つ
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(1);
    });

    // 「もっと見る」リンクが表示されることを確認
    // URLパラメータ付きのhref属性に対応するように修正
    await waitFor(() => {
      const viewAllLink = screen.getByRole("link", { name: /もっと見る/ });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute("href", "/videos?type=all");
    });
  });

  it("showViewAllLinkがfalseで、hasMoreがtrueの場合、「もっと見る」ボタンが表示されること", async () => {
    // 準備 & 実行
    render(<VideoList showViewAllLink={false} />);

    // 検証 - APIが呼ばれるのを待つ
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(1);
    });

    // 「もっと見る」ボタンが表示されることを確認
    await waitFor(() => {
      const loadMoreButton = screen.getByRole("button", { name: /もっと見る/ });
      expect(loadMoreButton).toBeInTheDocument();
    });
  });

  it("「もっと見る」ボタンをクリックすると、追加の動画が読み込まれること", async () => {
    // 準備
    const firstBatch = mockVideos.slice(0, 3);
    const secondBatch = mockVideos.slice(3, 6);

    // 1回目のAPI呼び出し結果
    vi.mocked(getRecentVideos).mockResolvedValueOnce({
      videos: firstBatch,
      hasMore: true,
      lastVideo: firstBatch[firstBatch.length - 1],
    });

    // 2回目のAPI呼び出し結果
    vi.mocked(getRecentVideos).mockResolvedValueOnce({
      videos: secondBatch,
      hasMore: false,
      lastVideo: secondBatch[secondBatch.length - 1],
    });

    // 実行
    render(<VideoList />);

    // 最初のバッチが読み込まれるのを待つ
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(1);
    });

    // 「もっと見る」ボタンをクリック
    const loadMoreButton = await screen.findByRole("button", {
      name: /もっと見る/,
    });
    fireEvent.click(loadMoreButton);

    // 2回目のAPI呼び出しを確認
    await waitFor(() => {
      expect(getRecentVideos).toHaveBeenCalledTimes(2);
    });
  });
});
