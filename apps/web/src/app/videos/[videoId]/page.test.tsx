import * as videoServer from "@/lib/videos/server";
import * as nextNavigation from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoPage from "./page";

// 必要なモジュールをモック化
vi.mock("@/lib/videos/server", () => ({
  getVideoByIdServer: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

// VideoPageClientコンポーネントをモック
vi.mock("./VideoPageClient", () => ({
  default: vi.fn(() => (
    <div data-testid="video-page-client">動画ページクライアント</div>
  )),
}));

describe("動画詳細ページ", () => {
  const mockVideo = {
    id: "test-video-id",
    title: "テスト動画",
    description: "テスト動画の説明文です",
    publishedAt: new Date("2025-05-01T12:00:00Z"),
    publishedAtISO: "2025-05-01T12:00:00Z",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    channelId: "test-channel-id",
    channelTitle: "テストチャンネル",
    lastFetchedAt: new Date(),
    lastFetchedAtISO: new Date().toISOString(),
  };

  // 各テスト前にモックをリセット
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("正常系: 動画IDに対応する動画が存在する場合、VideoPageClientを表示すること", async () => {
    // getVideoByIdServerのモックが動画情報を返すように設定
    vi.mocked(videoServer.getVideoByIdServer).mockResolvedValue(mockVideo);

    // コンポーネントをレンダリング
    const props = {
      params: { videoId: "test-video-id" },
      searchParams: {},
    };

    const result = await VideoPage(props);

    // 期待される関数呼び出し
    expect(videoServer.getVideoByIdServer).toHaveBeenCalledWith(
      "test-video-id",
    );
    expect(nextNavigation.notFound).not.toHaveBeenCalled();

    // レンダリング結果の検証
    expect(result).toBeDefined();
  });

  it("異常系: 動画IDに対応する動画が存在しない場合、notFound関数を呼び出すこと", async () => {
    // getVideoByIdServerのモックがnullを返すように設定
    vi.mocked(videoServer.getVideoByIdServer).mockResolvedValue(null);

    // コンポーネントをレンダリング
    const props = {
      params: { videoId: "non-existent-id" },
      searchParams: {},
    };

    await VideoPage(props);

    // 期待される関数呼び出し
    expect(videoServer.getVideoByIdServer).toHaveBeenCalledWith(
      "non-existent-id",
    );
    expect(nextNavigation.notFound).toHaveBeenCalled();
  });
});
