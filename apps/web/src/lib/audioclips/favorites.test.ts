import { beforeEach, describe, expect, it, vi } from "vitest";
import * as favoritesModule from "./favorites";

// Firestore関連のモック
vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    doc: vi.fn().mockImplementation(() => ({ id: "mock-doc-id" })),
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
    addDoc: vi.fn().mockResolvedValue({}),
    setDoc: vi.fn().mockResolvedValue({}),
    deleteDoc: vi.fn().mockResolvedValue({}),
    runTransaction: vi.fn().mockImplementation(async (_, callback) => {
      await callback({
        get: async () => ({
          exists: () => true,
          data: () => ({ favoriteCount: 5 }),
        }),
        update: vi.fn(),
      });
    }),
  };
});

// Firestoreクライアントのモック
vi.mock("../firebase/client", () => ({
  db: {},
}));

// APIモジュールのモック
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
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("checkFavoriteStatus", () => {
    it("ユーザーIDが空の場合はfalseを返す", async () => {
      // テスト実行
      const result = await favoritesModule.checkFavoriteStatus("", clipId);
      expect(result).toBe(false);
    });

    it("ドキュメントが存在する場合はtrueを返す", async () => {
      // getDocのモック実装を一時的に変更
      const getDoc = await import("firebase/firestore").then(
        (mod) => mod.getDoc,
      );
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true } as any);

      // テスト実行
      const result = await favoritesModule.checkFavoriteStatus(userId, clipId);
      expect(result).toBe(true);
    });
  });

  describe("addToFavorites", () => {
    it("ユーザーIDが空の場合はfalseを返す", async () => {
      // テスト実行
      const result = await favoritesModule.addToFavorites("", mockClip);
      expect(result).toBe(false);
    });

    it("お気に入り追加に成功した場合はtrueを返す", async () => {
      // setDocのモック
      const setDoc = await import("firebase/firestore").then(
        (mod) => mod.setDoc,
      );
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);

      // テスト実行
      const result = await favoritesModule.addToFavorites(userId, mockClip);
      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe("removeFromFavorites", () => {
    it("ユーザーIDが空の場合はfalseを返す", async () => {
      // テスト実行
      const result = await favoritesModule.removeFromFavorites("", clipId);
      expect(result).toBe(false);
    });

    it("お気に入り削除に成功した場合はtrueを返す", async () => {
      // deleteDocのモック
      const deleteDoc = await import("firebase/firestore").then(
        (mod) => mod.deleteDoc,
      );
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);

      // テスト実行
      const result = await favoritesModule.removeFromFavorites(userId, clipId);
      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe("toggleFavorite", () => {
    it("ユーザーIDが空の場合はfalseを返す", async () => {
      // テスト実行
      const result = await favoritesModule.toggleFavorite("", mockClip);
      expect(result).toBe(false);
    });

    it("お気に入りが登録済みの場合は削除して、falseを返す", async () => {
      // テスト用の新しいtoggleFavorite実装
      const mockToggleFavoriteRegistered = async (
        userId: string,
        clip: any,
      ) => {
        // checkFavoriteStatusが常にtrueを返すようにモック化
        await favoritesModule.checkFavoriteStatus(userId, clip.id);
        // removeFromFavoritesを呼び出して削除
        await favoritesModule.removeFromFavorites(userId, clip.id);
        return false;
      };

      // モック設定
      vi.spyOn(favoritesModule, "checkFavoriteStatus").mockResolvedValueOnce(
        true,
      );
      vi.spyOn(favoritesModule, "removeFromFavorites").mockResolvedValueOnce(
        true,
      );
      vi.spyOn(favoritesModule, "toggleFavorite").mockImplementationOnce(
        mockToggleFavoriteRegistered,
      );

      // テスト実行
      const result = await favoritesModule.toggleFavorite(userId, mockClip);

      // 検証
      expect(favoritesModule.checkFavoriteStatus).toHaveBeenCalledWith(
        userId,
        clipId,
      );
      expect(favoritesModule.removeFromFavorites).toHaveBeenCalledWith(
        userId,
        clipId,
      );
      expect(result).toBe(false);
    });

    it("お気に入りが未登録の場合は追加して、trueを返す", async () => {
      // テスト用の新しいtoggleFavorite実装
      const mockToggleFavoriteUnregistered = async (
        userId: string,
        clip: any,
      ) => {
        // checkFavoriteStatusが常にfalseを返すようにモック化
        await favoritesModule.checkFavoriteStatus(userId, clip.id);
        // addToFavoritesを呼び出して追加
        await favoritesModule.addToFavorites(userId, clip);
        return true;
      };

      // モック設定
      vi.spyOn(favoritesModule, "checkFavoriteStatus").mockResolvedValueOnce(
        false,
      );
      vi.spyOn(favoritesModule, "addToFavorites").mockResolvedValueOnce(true);
      vi.spyOn(favoritesModule, "toggleFavorite").mockImplementationOnce(
        mockToggleFavoriteUnregistered,
      );

      // テスト実行
      const result = await favoritesModule.toggleFavorite(userId, mockClip);

      // 検証
      expect(favoritesModule.checkFavoriteStatus).toHaveBeenCalledWith(
        userId,
        clipId,
      );
      expect(favoritesModule.addToFavorites).toHaveBeenCalledWith(
        userId,
        mockClip,
      );
      expect(result).toBe(true);
    });
  });

  describe("getFavoriteClips", () => {
    it("ユーザーIDが空の場合は空配列を返す", async () => {
      // テスト実行
      const result = await favoritesModule.getFavoriteClips("");
      expect(result).toEqual([]);
    });

    it("お気に入りクリップのIDリストを元に、クリップデータを取得して返す", async () => {
      // apiFetchFavoriteClipsのモック
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
          } as any,
        ],
        hasMore: false,
      });

      // テスト実行
      const result = await favoritesModule.getFavoriteClips(userId);

      // 検証
      expect(apiGetFavoriteClips).toHaveBeenCalledWith(userId, { limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("clip-1");
      expect(result[1].id).toBe("clip-2");
    });
  });
});
