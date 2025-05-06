/**
 * 動画管理に関するServer Actionsのテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモックを設定
vi.mock("firebase-admin/firestore", () => {
  const mockFirestore = {
    collection: vi.fn(),
  };

  return {
    getFirestore: vi.fn(() => mockFirestore),
  };
});

// getCurrentUserのモックを設定
vi.mock("../auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

// モジュールのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
import { getCurrentUser } from "../auth/getCurrentUser";
import { getRecentVideos, getVideo, getVideosByPlaylist } from "./actions";

describe("動画管理機能", () => {
  let mockFirestoreInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // モック用のデータ
    const mockVideos = [
      {
        id: "video1",
        data: () => ({
          videoId: "youtube_video_id_1",
          title: "テスト動画1",
          description: "テスト動画の説明1",
          publishedAt: { toDate: () => new Date("2025-05-01T12:00:00Z") },
          channelId: "channel1",
          channelTitle: "テストチャンネル1",
          thumbnailUrl: "https://example.com/thumb1.jpg",
          playlistId: "playlist1",
          duration: "PT10M30S",
          viewCount: 1000,
          likeCount: 100,
          commentCount: 20,
        }),
      },
      {
        id: "video2",
        data: () => ({
          videoId: "youtube_video_id_2",
          title: "テスト動画2",
          description: "テスト動画の説明2",
          publishedAt: { toDate: () => new Date("2025-04-28T12:00:00Z") },
          channelId: "channel1",
          channelTitle: "テストチャンネル1",
          thumbnailUrl: "https://example.com/thumb2.jpg",
          playlistId: "playlist1",
          duration: "PT5M15S",
          viewCount: 2000,
          likeCount: 200,
          commentCount: 30,
        }),
      },
      {
        id: "video3",
        data: () => ({
          videoId: "youtube_video_id_3",
          title: "テスト動画3",
          description: "テスト動画の説明3",
          publishedAt: { toDate: () => new Date("2025-04-25T12:00:00Z") },
          channelId: "channel2",
          channelTitle: "テストチャンネル2",
          thumbnailUrl: "https://example.com/thumb3.jpg",
          playlistId: "playlist2",
          duration: "PT7M45S",
          viewCount: 3000,
          likeCount: 300,
          commentCount: 40,
        }),
      },
    ];

    // ユーザー認証のモックを設定
    (getCurrentUser as any).mockResolvedValue({ uid: "user123" });

    // Firestoreのモックを設定
    mockFirestoreInstance = getFirestore() as unknown;

    // Firestoreクエリチェーン用のモックオブジェクトを作成
    const createQueryMock = () => {
      const queryMock = {
        where: vi.fn(() => queryMock),
        orderBy: vi.fn(() => queryMock),
        limit: vi.fn(() => queryMock),
        startAfter: vi.fn(() => queryMock),
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: mockVideos,
          size: mockVideos.length,
        }),
        doc: vi.fn((id) => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            id,
            data: () => mockVideos.find((v) => v.id === id)?.data() || null,
          }),
        })),
      };
      return queryMock;
    };

    mockFirestoreInstance.collection = vi.fn(() => createQueryMock());
  });

  /**
   * getRecentVideos関数のテスト
   */
  describe("getRecentVideos", () => {
    it("正常系：最新の動画リストを取得できること", async () => {
      // 関数を実行
      const result = await getRecentVideos();

      // Firestoreの呼び出しを検証
      expect(mockFirestoreInstance.collection).toHaveBeenCalledWith("videos");

      // 期待される結果を検証
      expect(result.videos).toHaveLength(3);
      expect(result.videos[0].videoId).toBe("youtube_video_id_1");
      expect(result.videos[1].videoId).toBe("youtube_video_id_2");
      expect(result.videos[2].videoId).toBe("youtube_video_id_3");
    });

    it("正常系：件数制限を指定できること", async () => {
      // モックの再設定 - 制限されたビデオを返すように
      const mockVideosLimited = [
        {
          id: "video1",
          data: () => ({
            videoId: "youtube_video_id_1",
            title: "テスト動画1",
            description: "テスト動画の説明1",
            publishedAt: { toDate: () => new Date("2025-05-01T12:00:00Z") },
            channelId: "channel1",
            channelTitle: "テストチャンネル1",
            thumbnailUrl: "https://example.com/thumb1.jpg",
            playlistId: "playlist1",
            duration: "PT10M30S",
            viewCount: 1000,
            likeCount: 100,
            commentCount: 20,
          }),
        },
        {
          id: "video2",
          data: () => ({
            videoId: "youtube_video_id_2",
            title: "テスト動画2",
            description: "テスト動画の説明2",
            publishedAt: { toDate: () => new Date("2025-04-28T12:00:00Z") },
            channelId: "channel1",
            channelTitle: "テストチャンネル1",
            thumbnailUrl: "https://example.com/thumb2.jpg",
            playlistId: "playlist1",
            duration: "PT5M15S",
            viewCount: 2000,
            likeCount: 200,
            commentCount: 30,
          }),
        },
        // hasMore判定のために制限+1個のデータを返す
        {
          id: "video3",
          data: () => ({
            videoId: "youtube_video_id_3",
            title: "テスト動画3",
            description: "テスト動画の説明3",
            publishedAt: { toDate: () => new Date("2025-04-25T12:00:00Z") },
            channelId: "channel2",
            channelTitle: "テストチャンネル2",
            thumbnailUrl: "https://example.com/thumb3.jpg",
            playlistId: "playlist2",
            duration: "PT7M45S",
            viewCount: 3000,
            likeCount: 300,
            commentCount: 40,
          }),
        },
      ];

      // クエリチェーン用のモックオブジェクトを作成
      const createQueryMock = () => {
        const queryMock = {
          where: vi.fn(() => queryMock),
          orderBy: vi.fn(() => queryMock),
          limit: vi.fn((limit) => {
            expect(limit).toBe(3); // 制限値+1（hasMore判定用）
            return {
              ...queryMock,
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: mockVideosLimited,
                size: mockVideosLimited.length,
              }),
            };
          }),
          startAfter: vi.fn(() => queryMock),
          get: vi.fn().mockResolvedValue({
            empty: false,
            docs: mockVideosLimited,
            size: mockVideosLimited.length,
          }),
          doc: vi.fn((id) => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              id,
              data: () =>
                mockVideosLimited.find((v) => v.id === id)?.data() || null,
            }),
          })),
        };
        return queryMock;
      };

      mockFirestoreInstance.collection = vi.fn(() => createQueryMock());

      // 関数を実行（件数制限2件）
      const result = await getRecentVideos({ limit: 2 });

      // 期待される結果を検証
      expect(result.videos).toHaveLength(2); // limit=2なので2件しか返さない
      expect(result.hasMore).toBe(true); // まだデータが残っている
    });

    it("正常系：ページネーションが機能すること", async () => {
      // モックの再設定 - 2ページ目のデータを返すように
      const mockVideosPage2 = [
        {
          id: "video3",
          data: () => ({
            videoId: "youtube_video_id_3",
            title: "テスト動画3",
            description: "テスト動画の説明3",
            publishedAt: { toDate: () => new Date("2025-04-25T12:00:00Z") },
            channelId: "channel2",
            channelTitle: "テストチャンネル2",
            thumbnailUrl: "https://example.com/thumb3.jpg",
            playlistId: "playlist2",
            duration: "PT7M45S",
            viewCount: 3000,
            likeCount: 300,
            commentCount: 40,
          }),
        },
      ];

      // クエリチェーン用のモックオブジェクトを作成
      const createQueryMock = () => {
        const queryMock = {
          where: vi.fn(() => queryMock),
          orderBy: vi.fn(() => queryMock),
          limit: vi.fn(() => queryMock),
          startAfter: vi.fn(() => {
            return {
              ...queryMock,
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: mockVideosPage2,
                size: mockVideosPage2.length,
              }),
            };
          }),
          get: vi.fn().mockResolvedValue({
            empty: false,
            docs: mockVideosPage2,
            size: mockVideosPage2.length,
          }),
        };
        return queryMock;
      };

      mockFirestoreInstance.collection = vi.fn(() => createQueryMock());

      // 関数を実行（ページネーションあり）
      const result = await getRecentVideos({ lastPublishedAt: new Date() });

      // 期待される結果を検証
      expect(result.videos).toHaveLength(1);
      expect(result.hasMore).toBe(false); // これ以上データがない
    });

    it("異常系：エラー発生時には例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベースエラー";

      mockFirestoreInstance.collection = vi.fn(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(getRecentVideos()).rejects.toThrow(
        `動画の取得に失敗しました: ${errorMessage}`,
      );
    });

    it("異常系：結果が空の場合は空配列を返すこと", async () => {
      // モックを上書きして空の結果をシミュレート
      // クエリチェーン用のモックオブジェクトを作成
      const createEmptyQueryMock = () => {
        const queryMock = {
          where: vi.fn(() => queryMock),
          orderBy: vi.fn(() => queryMock),
          limit: vi.fn(() => {
            return {
              ...queryMock,
              get: vi.fn().mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
              }),
            };
          }),
          startAfter: vi.fn(() => queryMock),
          get: vi.fn().mockResolvedValue({
            empty: true,
            docs: [],
            size: 0,
          }),
        };
        return queryMock;
      };

      mockFirestoreInstance.collection = vi.fn(() => createEmptyQueryMock());

      // 関数を実行
      const result = await getRecentVideos();

      // 期待される結果を検証
      expect(result.videos).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  /**
   * getVideosByPlaylist関数のテスト
   */
  describe("getVideosByPlaylist", () => {
    it("正常系：プレイリストIDによる動画一覧を取得できること", async () => {
      const playlistId = "playlist1";

      // モックの再設定 - プレイリストでフィルタリングされたビデオを返すように
      const mockVideosInPlaylist = [
        {
          id: "video1",
          data: () => ({
            videoId: "youtube_video_id_1",
            title: "テスト動画1",
            description: "テスト動画の説明1",
            publishedAt: { toDate: () => new Date("2025-05-01T12:00:00Z") },
            channelId: "channel1",
            channelTitle: "テストチャンネル1",
            thumbnailUrl: "https://example.com/thumb1.jpg",
            playlistId: "playlist1",
            duration: "PT10M30S",
            viewCount: 1000,
            likeCount: 100,
            commentCount: 20,
          }),
        },
        {
          id: "video2",
          data: () => ({
            videoId: "youtube_video_id_2",
            title: "テスト動画2",
            description: "テスト動画の説明2",
            publishedAt: { toDate: () => new Date("2025-04-28T12:00:00Z") },
            channelId: "channel1",
            channelTitle: "テストチャンネル1",
            thumbnailUrl: "https://example.com/thumb2.jpg",
            playlistId: "playlist1",
            duration: "PT5M15S",
            viewCount: 2000,
            likeCount: 200,
            commentCount: 30,
          }),
        },
      ];

      mockFirestoreInstance.collection = vi.fn(() => ({
        where: vi.fn((field, operator, value) => {
          expect(field).toBe("playlistId");
          expect(operator).toBe("==");
          expect(value).toBe(playlistId);
          return {
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn().mockResolvedValue({
                  empty: false,
                  docs: mockVideosInPlaylist,
                  size: mockVideosInPlaylist.length,
                }),
              })),
            })),
          };
        }),
      }));

      // 関数を実行
      const result = await getVideosByPlaylist(playlistId);

      // Firestoreの呼び出しを検証
      expect(mockFirestoreInstance.collection).toHaveBeenCalledWith("videos");

      // 期待される結果を検証
      expect(result.videos).toHaveLength(2);
      expect(result.videos.map((v) => v.videoId)).toEqual([
        "youtube_video_id_1",
        "youtube_video_id_2",
      ]);
    });

    it("異常系：プレイリストIDが未指定の場合はエラーになること", async () => {
      // 関数呼び出しで例外がスローされることを検証
      await expect(getVideosByPlaylist("")).rejects.toThrow(
        "プレイリストIDが指定されていません",
      );
    });
  });

  /**
   * getVideo関数のテスト
   */
  describe("getVideo", () => {
    it("正常系：動画IDで特定の動画を取得できること", async () => {
      const videoId = "video1";

      // 関数を実行
      const result = await getVideo(videoId);

      // Firestoreの呼び出しを検証
      expect(mockFirestoreInstance.collection).toHaveBeenCalledWith("videos");

      // 期待される結果を検証
      expect(result).not.toBeNull();
      expect(result?.videoId).toBe("youtube_video_id_1");
      expect(result?.title).toBe("テスト動画1");
    });

    it("異常系：存在しない動画IDの場合はnullを返すこと", async () => {
      // 存在しない動画ID
      const nonExistentVideoId = "non_existent";

      // モックを上書きして存在しない場合をシミュレート
      mockFirestoreInstance.collection = vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            exists: false,
            data: () => null,
          }),
        })),
      }));

      // 関数を実行
      const result = await getVideo(nonExistentVideoId);

      // 期待される結果を検証
      expect(result).toBeNull();
    });

    it("異常系：動画IDが未指定の場合はエラーになること", async () => {
      // 関数呼び出しで例外がスローされることを検証
      await expect(getVideo("")).rejects.toThrow("動画IDが指定されていません");
    });

    it("異常系：エラー発生時には例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベースエラー";

      mockFirestoreInstance.collection = vi.fn(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(getVideo("video1")).rejects.toThrow(
        `動画の取得に失敗しました: ${errorMessage}`,
      );
    });
  });
});
