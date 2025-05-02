import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeFirebaseAdmin } from "../api/auth/firebase-admin";
import { getCurrentUser } from "../api/auth/getCurrentUser";
import {
  checkFavoriteStatus,
  getFavoriteClips,
  setFavoriteStatus,
} from "./audioclipFavorites";

// Firestoreのモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

// Firebase Adminのモック
vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: () => ({
      collection: mockCollection,
    }),
    FieldValue: {
      serverTimestamp: () => new Date(),
      increment: (n: number) => n,
    },
  };
});

// Next.js キャッシュのモック
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCurrentUserのモック
vi.mock("../api/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

// initializeFirebaseAdminのモック
vi.mock("../api/auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

describe("お気に入り機能のテスト", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // モックの初期設定
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });

    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      get: mockGet,
    });

    mockOrderBy.mockReturnValue({
      limit: mockLimit,
    });

    mockLimit.mockReturnValue({
      get: mockGet,
      startAfter: mockStartAfter,
    });

    mockStartAfter.mockReturnValue({
      get: mockGet,
    });

    // デフォルトの認証ユーザーを設定
    (getCurrentUser as any).mockResolvedValue({
      uid: "test-user-123",
      displayName: "テストユーザー",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("setFavoriteStatus関数", () => {
    it("お気に入り登録が正常に行われること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          videoId: "video-123",
        }),
      });

      mockUpdate.mockResolvedValue({});
      mockSet.mockResolvedValue({});

      // 関数実行
      const result = await setFavoriteStatus("clip-123", true);

      // 検証
      expect(initializeFirebaseAdmin).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty("favoriteCount", 1);

      expect(mockCollection).toHaveBeenCalledWith("audioClipFavorites");
      expect(mockDoc).toHaveBeenCalledWith("test-user-123_clip-123");
      expect(mockSet).toHaveBeenCalled();
      expect(mockSet.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userId: "test-user-123",
          clipId: "clip-123",
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");

      expect(result).toEqual({
        id: "clip-123",
        message: "クリップがお気に入りに追加されました",
        isFavorite: true,
      });
    });

    it("お気に入り解除が正常に行われること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          videoId: "video-123",
        }),
      });

      mockUpdate.mockResolvedValue({});
      mockDelete.mockResolvedValue({});

      // 関数実行
      const result = await setFavoriteStatus("clip-123", false);

      // 検証
      expect(initializeFirebaseAdmin).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty("favoriteCount", -1);

      expect(mockCollection).toHaveBeenCalledWith("audioClipFavorites");
      expect(mockDoc).toHaveBeenCalledWith("test-user-123_clip-123");
      expect(mockDelete).toHaveBeenCalled();

      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");

      expect(result).toEqual({
        id: "clip-123",
        message: "クリップがお気に入りから削除されました",
        isFavorite: false,
      });
    });

    it("未認証ユーザーがお気に入り操作を行うとエラーになること", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行と検証
      await expect(setFavoriteStatus("clip-123", true)).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("クリップIDが指定されていない場合はエラーになること", async () => {
      // 空のクリップID
      await expect(setFavoriteStatus("", true)).rejects.toThrow(
        "クリップIDが必要です",
      );
    });

    it("存在しないクリップはお気に入り設定できないこと", async () => {
      // 存在しないクリップ
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行と検証
      await expect(setFavoriteStatus("non-existent", true)).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });
  });

  describe("checkFavoriteStatus関数", () => {
    it("お気に入り登録済みのクリップはtrueを返すこと", async () => {
      // お気に入り登録済み
      mockGet.mockResolvedValue({
        exists: true,
      });

      // 関数実行
      const result = await checkFavoriteStatus("clip-123");

      // 検証
      expect(initializeFirebaseAdmin).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith("audioClipFavorites");
      expect(mockDoc).toHaveBeenCalledWith("test-user-123_clip-123");

      expect(result).toEqual({
        isFavorite: true,
      });
    });

    it("お気に入り未登録のクリップはfalseを返すこと", async () => {
      // お気に入り未登録
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行
      const result = await checkFavoriteStatus("clip-123");

      // 検証
      expect(result).toEqual({
        isFavorite: false,
      });
    });

    it("未認証ユーザーはfalseを返すこと", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行
      const result = await checkFavoriteStatus("clip-123");

      // 検証
      expect(result).toEqual({
        isFavorite: false,
      });
    });

    it("クリップIDが指定されていない場合もfalseを返すこと", async () => {
      // 空のクリップIDでも例外は投げず、falseを返す
      const result = await checkFavoriteStatus("");

      // 検証
      expect(result).toEqual({
        isFavorite: false,
      });
    });
  });

  describe("getFavoriteClips関数", () => {
    it("お気に入りクリップ一覧が正常に取得できること", async () => {
      // お気に入りリストのモック
      const mockFavorites = [
        { data: () => ({ clipId: "clip-1" }) },
        { data: () => ({ clipId: "clip-2" }) },
      ];

      // クリップデータのモック
      const mockClips = [
        {
          id: "clip-1",
          data: () => ({
            title: "お気に入りクリップ1",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
        {
          id: "clip-2",
          data: () => ({
            title: "お気に入りクリップ2",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
      ];

      // モックの設定
      mockGet.mockImplementation((key) => {
        if (!key) {
          // 最初の呼び出し（お気に入りリスト取得）
          return Promise.resolve({
            docs: mockFavorites,
          });
        }
        // 2回目の呼び出し（クリップデータ取得）
        return Promise.resolve({
          docs: mockClips,
        });
      });

      // whereの2回目の呼び出しでモックを変更
      const mockWhereSecond = vi.fn().mockReturnValue({
        get: () =>
          Promise.resolve({
            docs: mockClips,
          }),
      });

      // 最初のwhereはデフォルトのモック、2回目は新しいモック
      mockWhere.mockImplementation((field, operator, value) => {
        if (field === "userId") {
          return {
            orderBy: mockOrderBy,
          };
        }
        if (field === "__name__") {
          return mockWhereSecond();
        }
        return { where: mockWhere };
      });

      // 関数実行
      const result = await getFavoriteClips({ limit: 2 });

      // 検証
      expect(initializeFirebaseAdmin).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith("audioClipFavorites");
      expect(mockWhere).toHaveBeenCalledWith("userId", "==", "test-user-123");

      expect(result.clips.length).toBe(2);
      expect(result.clips[0].id).toBe("clip-1");
      expect(result.clips[1].id).toBe("clip-2");
      expect(result.hasMore).toBe(true);
    });

    it("お気に入りが存在しない場合は空の配列を返すこと", async () => {
      // お気に入りリストが空
      mockGet.mockResolvedValue({
        docs: [],
      });

      // 関数実行
      const result = await getFavoriteClips({});

      // 検証
      expect(result).toEqual({
        clips: [],
        hasMore: false,
      });
    });

    it("未認証ユーザーはエラーになること", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行と検証
      await expect(getFavoriteClips({})).rejects.toThrow("認証が必要です");
    });

    it("startAfterパラメータを使ってページネーションが正しく動作すること", async () => {
      // お気に入りリストのモック（空でOK）
      mockGet.mockResolvedValue({
        docs: [],
      });

      const startAfterDate = new Date("2025-04-30");

      // 関数実行
      await getFavoriteClips({ startAfter: startAfterDate });

      // 検証
      expect(mockStartAfter).toHaveBeenCalled();
    });
  });
});
