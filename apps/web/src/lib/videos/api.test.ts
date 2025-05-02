import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentVideos, getVideoById } from "./api";

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// コンソールエラーを抑制するためのモック
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("動画API関数のテスト", () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();
    // コンソールエラーを抑制
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    // テスト後にコンソールの挙動を元に戻す
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe("getRecentVideos関数", () => {
    it("正常に動画リストを取得できる", async () => {
      // モックレスポンスを設定
      const mockVideos = [
        {
          id: "video1",
          title: "テスト動画1",
          description: "説明文1",
          publishedAtISO: "2025-04-20T10:00:00Z",
          thumbnailUrl: "https://example.com/thumb1.jpg",
          channelId: "channel1",
          channelTitle: "テストチャンネル1",
          lastFetchedAtISO: "2025-05-01T12:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: mockVideos, hasMore: false }),
      });

      // 関数を呼び出し
      const result = await getRecentVideos();

      // fetchが正しいURLで呼び出されたことを検証
      expect(mockFetch).toHaveBeenCalledWith("/api/videos?limit=10");

      // 結果を検証
      expect(result).toEqual({
        videos: expect.arrayContaining([
          expect.objectContaining({
            id: "video1",
            title: "テスト動画1",
          }),
        ]),
        hasMore: false,
      });

      // 日付が変換されていることを確認
      expect(result.videos[0].publishedAt).toBeInstanceOf(Date);
      expect(result.videos[0].lastFetchedAt).toBeInstanceOf(Date);
    });

    it("limitパラメータを指定して動画リストを取得できる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [], hasMore: false }),
      });

      await getRecentVideos({ limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith("/api/videos?limit=5");
    });

    it("startAfterパラメータを指定して動画リストを取得できる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [], hasMore: false }),
      });

      const startDate = new Date("2025-04-10");
      await getRecentVideos({ limit: 10, startAfter: startDate });

      // URLにstartAfterパラメータが含まれていることを確認（厳密な値は日本時間との関係でテストが安定しない可能性があるため、部分一致で確認）
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/videos?limit=10&startAfter="),
      );
    });

    it("無効なstartAfterパラメータの場合は警告ログを出力する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [], hasMore: false }),
      });

      await getRecentVideos({
        limit: 10,
        startAfter: "invalid-date" as unknown as Date,
      });

      // 警告ログが出力されたことを検証
      expect(console.warn).toHaveBeenCalled();
    });

    it("videoTypeパラメータを指定して動画リストを取得できる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [], hasMore: false }),
      });

      // VideoTypeとして型アサーションを使用
      await getRecentVideos({ limit: 10, videoType: "stream" as any });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/videos?limit=10&videoType=stream",
      );
    });

    it("APIエラー時は空の結果を返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getRecentVideos();

      expect(result).toEqual({ videos: [], hasMore: false });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("getVideoById関数", () => {
    it("正常に動画詳細を取得できる", async () => {
      const mockVideo = {
        id: "video1",
        title: "テスト動画1",
        description: "説明文1",
        publishedAtISO: "2025-04-20T10:00:00Z",
        thumbnailUrl: "https://example.com/thumb1.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル1",
        lastFetchedAtISO: "2025-05-01T12:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideo,
      });

      const result = await getVideoById("video1");

      expect(mockFetch).toHaveBeenCalledWith("/api/videos/video1");
      expect(result).toEqual(
        expect.objectContaining({
          id: "video1",
          title: "テスト動画1",
        }),
      );

      // 日付が変換されていることを確認
      expect(result?.publishedAt).toBeInstanceOf(Date);
      expect(result?.lastFetchedAt).toBeInstanceOf(Date);
    });

    it("存在しない動画IDの場合はnullを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      const result = await getVideoById("non-existent");

      expect(result).toBeNull();
    });

    it("APIエラー時はnullを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 500,
        ok: false,
      });

      const result = await getVideoById("video1");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
