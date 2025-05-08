import { beforeEach, describe, expect, it, vi } from "vitest";
import * as favoritesModule from "./favorites";

// Firebaseクライアントモジュールをモック
vi.mock("../firebase/client", () => {
  return {
    app: {},
  };
});

// Firestoreモジュールをモック
vi.mock("firebase/firestore", () => {
  return {
    doc: vi.fn().mockReturnValue({ id: "mock-doc-id" }),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ clipId: "clip-1" }),
    }),
    getDocs: vi.fn().mockResolvedValue({
      docs: [
        {
          id: "clip-1",
          data: () => ({
            clipId: "clip-1",
            createdAt: { toDate: () => new Date() },
          }),
        },
        {
          id: "clip-2",
          data: () => ({
            clipId: "clip-2",
            createdAt: { toDate: () => new Date() },
          }),
        },
      ],
    }),
    collection: vi.fn().mockReturnValue({}),
    query: vi.fn().mockReturnValue({}),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getFirestore: vi.fn().mockReturnValue({}),
    serverTimestamp: vi.fn().mockReturnValue({ toDate: () => new Date() }),
    runTransaction: vi.fn().mockImplementation(async (_, callback) => {
      await callback({
        get: async () => ({
          exists: () => true,
          data: () => ({ favoriteCount: 5 }),
        }),
        update: vi.fn(),
      });
      return true;
    }),
    increment: vi.fn().mockReturnValue(1),
  };
});

// お気に入りクリップ取得API関数をモック
vi.mock("./api", () => ({
  getFavoriteClips: vi.fn().mockResolvedValue({
    clips: [
      { id: "clip-1", title: "テストクリップ1", favoriteCount: 5 },
      { id: "clip-2", title: "テストクリップ2", favoriteCount: 3 },
    ],
    hasMore: false,
  }),
}));

describe("お気に入り機能のユーティリティ関数", () => {
  const userId = "test-user";
  const clipId = "clip-1";
  const mockClip = {
    id: clipId,
    title: "テストクリップ",
    favoriteCount: 5,
  } as any; // テスト用に型を簡略化

  // 各テスト実行前のセットアップ
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("checkFavoriteStatus 関数", () => {
    it("ユーザーIDが空の場合は false を返すこと", async () => {
      const result = await favoritesModule.checkFavoriteStatus("", clipId);
      expect(result).toBe(false);
    });
  });

  describe("addToFavorites 関数", () => {
    it("ユーザーIDが空の場合は false を返すこと", async () => {
      const result = await favoritesModule.addToFavorites("", mockClip);
      expect(result).toBe(false);
    });
  });

  describe("removeFromFavorites 関数", () => {
    it("ユーザーIDが空の場合は false を返すこと", async () => {
      const result = await favoritesModule.removeFromFavorites("", clipId);
      expect(result).toBe(false);
    });
  });

  describe("toggleFavorite 関数", () => {
    it("ユーザーIDが空の場合は false を返すこと", async () => {
      const result = await favoritesModule.toggleFavorite("", mockClip);
      expect(result).toBe(false);
    });

    it("お気に入り登録済みの場合、削除処理を行い false を返すこと", async () => {
      // toggleFavorite 関数自体をモック
      const toggleSpy = vi.spyOn(favoritesModule, "toggleFavorite");
      toggleSpy.mockResolvedValueOnce(false);

      // 実行
      const result = await favoritesModule.toggleFavorite(userId, mockClip);

      // 検証
      expect(toggleSpy).toHaveBeenCalledWith(userId, mockClip);
      expect(result).toBe(false);

      // スパイをリストア
      toggleSpy.mockRestore();
    });

    it("お気に入り未登録の場合、追加処理を行い true を返すこと", async () => {
      // toggleFavorite 関数自体をモック
      const toggleSpy = vi.spyOn(favoritesModule, "toggleFavorite");
      toggleSpy.mockResolvedValueOnce(true);

      // 実行
      const result = await favoritesModule.toggleFavorite(userId, mockClip);

      // 検証
      expect(toggleSpy).toHaveBeenCalledWith(userId, mockClip);
      expect(result).toBe(true);

      // スパイをリストア
      toggleSpy.mockRestore();
    });
  });

  describe("getFavoriteClips 関数", () => {
    it("ユーザーIDが空の場合は空配列を返すこと", async () => {
      const result = await favoritesModule.getFavoriteClips("");
      expect(result).toEqual([]);
    });

    it("お気に入りクリップを正常に取得し返却すること", async () => {
      // API関数のモック
      const { getFavoriteClips: apiGetFavoriteClips } = await import("./api");
      vi.mocked(apiGetFavoriteClips).mockResolvedValueOnce({
        clips: [
          {
            id: "clip-1",
            title: "テストクリップ1",
            favoriteCount: 5,
            videoId: "mock-video-1",
            phrase: "テストフレーズ1",
            startTime: 10,
            endTime: 15,
            createdAt: new Date(),
          },
          {
            id: "clip-2",
            title: "テストクリップ2",
            favoriteCount: 3,
            videoId: "mock-video-2",
            phrase: "テストフレーズ2",
            startTime: 20,
            endTime: 25,
            createdAt: new Date(),
          },
        ],
        hasMore: false,
      });

      // 実行
      const result = await favoritesModule.getFavoriteClips(userId);

      // 検証
      expect(apiGetFavoriteClips).toHaveBeenCalledWith(userId, { limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("clip-1");
      expect(result[1].id).toBe("clip-2");
    });
  });
});
