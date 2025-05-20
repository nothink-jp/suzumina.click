import type { youtube_v3 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";

// firestoreをモックする（vi.mockはファイルの先頭でhoistingされる）
vi.mock("./firestore", () => {
  // モックオブジェクトを作成
  const mockDoc = vi.fn().mockReturnValue({
    id: "test-video-id",
  });

  const mockCollection = {
    doc: mockDoc,
  };

  const mockBatch = {
    set: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: {
      collection: vi.fn().mockReturnValue(mockCollection),
      batch: vi.fn().mockReturnValue(mockBatch),
    },
    Timestamp: {
      now: vi
        .fn()
        .mockReturnValue({ seconds: 1621234567, nanoseconds: 123000000 }),
      fromDate: vi.fn().mockImplementation((date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => date,
      })),
    },
  };
});

// loggerをモック
vi.mock("./logger", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

import * as firestore from "./firestore";
// モック後にインポート（これが重要）
import * as youtubeFirestore from "./youtube-firestore";

describe("youtube-firestore", () => {
  // YouTube API モックデータ
  const mockVideoWithAllData: youtube_v3.Schema$Video = {
    id: "test-video-id",
    snippet: {
      title: "テスト動画タイトル",
      description: "これはテスト用の動画説明です。",
      publishedAt: "2025-05-15T10:00:00Z",
      thumbnails: {
        default: { url: "https://example.com/default.jpg" },
        medium: { url: "https://example.com/medium.jpg" },
        high: { url: "https://example.com/high.jpg" },
        standard: { url: "https://example.com/standard.jpg" },
        maxres: { url: "https://example.com/maxres.jpg" },
      },
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      liveBroadcastContent: "none",
    },
    statistics: {
      viewCount: "1000",
      likeCount: "100",
      commentCount: "50",
    },
  };

  const mockLiveVideo: youtube_v3.Schema$Video = {
    id: "live-video-id",
    snippet: {
      title: "ライブ配信テスト",
      description: "これはライブ配信のテスト動画です。",
      publishedAt: "2025-05-20T15:00:00Z",
      thumbnails: {
        default: { url: "https://example.com/live-default.jpg" },
        high: { url: "https://example.com/live-high.jpg" },
      },
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      liveBroadcastContent: "live",
    },
  };

  const mockUpcomingVideo: youtube_v3.Schema$Video = {
    id: "upcoming-video-id",
    snippet: {
      title: "配信予定テスト",
      description: "これは配信予定のテスト動画です。",
      publishedAt: "2025-05-25T20:00:00Z",
      thumbnails: {
        default: { url: "https://example.com/upcoming-default.jpg" },
      },
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      liveBroadcastContent: "upcoming",
    },
  };

  const mockInvalidVideo: youtube_v3.Schema$Video = {
    snippet: {
      title: "無効な動画",
      description: "IDがない無効な動画です。",
    },
  };

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.clearAllMocks();
  });

  describe("convertVideoDataForFirestore", () => {
    it("正常な動画データをFirestore形式に変換できる", () => {
      const result =
        youtubeFirestore.convertVideoDataForFirestore(mockVideoWithAllData);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        videoId: "test-video-id",
        title: "テスト動画タイトル",
        description: "これはテスト用の動画説明です。",
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        thumbnailUrl: "https://example.com/maxres.jpg",
        liveBroadcastContent: "none",
      });
    });

    it("ライブ配信動画のliveBroadcastContentが正しく設定される", () => {
      const result =
        youtubeFirestore.convertVideoDataForFirestore(mockLiveVideo);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        videoId: "live-video-id",
        liveBroadcastContent: "live",
      });
    });

    it("配信予定動画のliveBroadcastContentが正しく設定される", () => {
      const result =
        youtubeFirestore.convertVideoDataForFirestore(mockUpcomingVideo);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        videoId: "upcoming-video-id",
        liveBroadcastContent: "upcoming",
      });
    });

    it("無効な動画データの場合はnullを返す", () => {
      const result =
        youtubeFirestore.convertVideoDataForFirestore(mockInvalidVideo);
      expect(result).toBeNull();
    });
  });

  describe("saveVideosToFirestore", () => {
    it("空の動画リストの場合は0を返す", async () => {
      const result = await youtubeFirestore.saveVideosToFirestore([]);
      expect(result).toBe(0);
    });

    it("有効な動画をFirestoreに保存できる", async () => {
      const result = await youtubeFirestore.saveVideosToFirestore([
        mockVideoWithAllData,
      ]);

      expect(result).toBe(1);
      expect(firestore.default.collection).toHaveBeenCalledWith("videos");
      // モックされた関数が正しく呼ばれたことを確認
      expect(firestore.default.collection("videos").doc).toHaveBeenCalledWith(
        "test-video-id",
      );
      expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
      expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
    });

    it("複数の動画をバッチ処理できる", async () => {
      // docメソッドのモックを書き換え
      const mockDoc = firestore.default.collection("").doc;
      vi.mocked(mockDoc).mockImplementation((id) => ({ id }) as any);

      const videos = [
        mockVideoWithAllData,
        mockLiveVideo,
        mockUpcomingVideo,
        mockInvalidVideo,
      ];
      const result = await youtubeFirestore.saveVideosToFirestore(videos);

      // 無効な動画を除いた数が返される
      expect(result).toBe(3);
      expect(firestore.default.batch().set).toHaveBeenCalledTimes(3);
      expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
    });

    it("バッチサイズ上限を超える場合に複数回コミットする", async () => {
      // docメソッドのモックを書き換え
      const mockDoc = firestore.default.collection("").doc;
      vi.mocked(mockDoc).mockImplementation((id) => ({ id }) as any);

      // コミット回数をテストするための大量データ
      // MAX_FIRESTORE_BATCH_SIZE = 500なので、501件で2回コミットされることを確認
      const largeVideosList = Array(501).fill(mockVideoWithAllData);

      await youtubeFirestore.saveVideosToFirestore(largeVideosList);

      // バッチコミットが2回呼ばれることを確認（500件 + 1件）
      expect(firestore.default.batch().commit).toHaveBeenCalledTimes(2);
    });
  });
});
