import * as videosActions from "@/actions/videos/actions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentVideos, getVideoById } from "./api";

// Server Actionをモック化
vi.mock("@/actions/videos/actions", () => ({
  getRecentVideos: vi.fn(),
  getVideo: vi.fn(),
}));

describe("動画API関数", () => {
  // モックデータを準備
  const mockVideoData = {
    id: "video1",
    title: "テスト動画1",
    description: "これはテスト動画の説明です",
    publishedAt: "2025-04-30T12:00:00Z",
    thumbnails: {
      default: { url: "https://example.com/thumbnail-sm.jpg" },
      medium: { url: "https://example.com/thumbnail-md.jpg" },
      high: { url: "https://example.com/thumbnail-lg.jpg" },
    },
    channelId: "channel1",
    channelTitle: "テストチャンネル",
  };

  // 各テスト前にモックをリセット
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getRecentVideos関数", () => {
    it("正常系: デフォルトパラメータで動画リストが取得できること", async () => {
      // モックの戻り値を設定
      const mockResult = {
        videos: [mockVideoData],
        hasMore: false,
        lastVideo: null,
      };
      vi.mocked(videosActions.getRecentVideos).mockResolvedValue(mockResult);

      // 関数を実行
      const result = await getRecentVideos();

      // アサーション
      expect(videosActions.getRecentVideos).toHaveBeenCalledWith({
        limit: 10,
        startAfter: undefined,
        videoType: undefined,
      });
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe("video1");
      expect(result.videos[0].title).toBe("テスト動画1");
      expect(result.hasMore).toBe(false);
      expect(result.lastVideo).toBeUndefined();
    });

    it("正常系: ページネーションパラメータを指定して動画リストが取得できること", async () => {
      // モックの戻り値を設定
      const mockResult = {
        videos: [mockVideoData],
        hasMore: true,
        lastVideo: mockVideoData,
      };
      vi.mocked(videosActions.getRecentVideos).mockResolvedValue(mockResult);

      // 関数を実行（パラメータを指定）
      const startAfterDate = new Date("2025-04-29T12:00:00Z");
      const result = await getRecentVideos({
        limit: 5,
        startAfter: startAfterDate,
        videoType: "archived",
      });

      // アサーション
      expect(videosActions.getRecentVideos).toHaveBeenCalledWith({
        limit: 5,
        startAfter: startAfterDate.toISOString(),
        videoType: "archived",
      });
      expect(result.videos).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.lastVideo).toBeDefined();
      expect(result.lastVideo?.id).toBe("video1");
    });

    it("例外処理: Server Actionがエラーを投げた場合、空の結果を返すこと", async () => {
      // モックにエラーを設定
      vi.mocked(videosActions.getRecentVideos).mockRejectedValue(
        new Error("APIエラー"),
      );

      // 関数を実行
      const result = await getRecentVideos();

      // アサーション
      expect(result.videos).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.lastVideo).toBeUndefined();
    });
  });

  describe("getVideoById関数", () => {
    it("正常系: 指定したIDの動画が取得できること", async () => {
      // モックの戻り値を設定
      vi.mocked(videosActions.getVideo).mockResolvedValue(mockVideoData);

      // 関数を実行
      const result = await getVideoById("video1");

      // アサーション
      expect(videosActions.getVideo).toHaveBeenCalledWith("video1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("video1");
      expect(result?.title).toBe("テスト動画1");
      expect(result?.description).toBe("これはテスト動画の説明です");
      expect(result?.thumbnailUrl).toBe("https://example.com/thumbnail-lg.jpg");
    });

    it("正常系: thumbnailsプロパティの優先順位が正しく処理されること", async () => {
      // サムネイルがhighだけない場合
      const mockDataWithoutHighThumb = {
        ...mockVideoData,
        thumbnails: {
          default: { url: "https://example.com/thumbnail-sm.jpg" },
          medium: { url: "https://example.com/thumbnail-md.jpg" },
        },
      };
      vi.mocked(videosActions.getVideo).mockResolvedValue(
        mockDataWithoutHighThumb,
      );

      // 関数を実行
      const result = await getVideoById("video1");

      // アサーション
      expect(result?.thumbnailUrl).toBe("https://example.com/thumbnail-md.jpg");
    });

    it("正常系: Serverから null が返された場合も正しく処理されること", async () => {
      // nullを返すようにモックを設定
      vi.mocked(videosActions.getVideo).mockResolvedValue(null);

      // 関数を実行
      const result = await getVideoById("not-exist");

      // アサーション
      expect(result).toBeNull();
    });

    it("例外処理: Server Actionがエラーを投げた場合、nullを返すこと", async () => {
      // モックにエラーを設定
      vi.mocked(videosActions.getVideo).mockRejectedValue(
        new Error("APIエラー"),
      );

      // 関数を実行
      const result = await getVideoById("video1");

      // アサーション
      expect(result).toBeNull();
    });
  });
});
